/**
 * WOR-45: AI Synthesis generation — action and mutation contract tests
 *
 * Covers:
 * - AC3: Claude response is parsed as JSON with shape { forInitiator, forInvitee }
 * - AC6: Synthesis texts are written to partyStates.synthesisText + synthesisGeneratedAt
 * - AC7: Case status advances to READY_FOR_JOINT in the same mutation that writes synthesis
 * - AC8: Synthesis is one-shot, non-streaming per TechSpec TQ3
 *
 * This file imports from convex/synthesis/generate.ts which does not exist yet.
 * The entire file is expected to fail at module resolution until WOR-45 is
 * implemented. This is the intended red-state: the implementation module is
 * missing, not the test code.
 */
import { describe, test, expect, vi } from "vitest";

import {
  parseSynthesisResponse,
  writeSynthesisResults,
  generateSynthesis,
  _getAllPrivateMessages,
} from "../../convex/synthesis/generate";
import { _getCase, _getPartyStates } from "../../convex/privateCoaching";

// Mock the Anthropic SDK at module level so AC8 can verify non-streaming usage
const mockCreate = vi.fn().mockResolvedValue({
  content: [
    {
      type: "text",
      text: JSON.stringify({
        forInitiator: "Initiator synthesis.",
        forInvitee: "Invitee synthesis.",
      }),
    },
  ],
});

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const VALID_SYNTHESIS_JSON = JSON.stringify({
  forInitiator:
    "There are areas of common ground around wanting better communication. The key disagreement centers on decision-making authority. Consider approaching the joint session with curiosity about shared goals.",
  forInvitee:
    "Both parties value the partnership. The tension revolves around autonomy in technical choices. Try framing your needs as preferences rather than demands in the joint session.",
});

// ---------------------------------------------------------------------------
// AC 3: Claude response is parsed as JSON { forInitiator, forInvitee }
// ---------------------------------------------------------------------------
describe("AC3: Claude response parsed as JSON with { forInitiator, forInvitee }", () => {
  test("valid JSON with both fields parses successfully", () => {
    const result = parseSynthesisResponse(VALID_SYNTHESIS_JSON);
    expect(result).toHaveProperty("forInitiator");
    expect(result).toHaveProperty("forInvitee");
    expect(typeof result.forInitiator).toBe("string");
    expect(typeof result.forInvitee).toBe("string");
  });

  test("malformed JSON throws an error", () => {
    expect(() => parseSynthesisResponse("not valid json {")).toThrow();
  });

  test("JSON missing forInitiator field throws an error", () => {
    const incomplete = JSON.stringify({ forInvitee: "some text" });
    expect(() => parseSynthesisResponse(incomplete)).toThrow();
  });

  test("JSON missing forInvitee field throws an error", () => {
    const incomplete = JSON.stringify({ forInitiator: "some text" });
    expect(() => parseSynthesisResponse(incomplete)).toThrow();
  });

  test("JSON with non-string field values throws an error", () => {
    const invalid = JSON.stringify({ forInitiator: 123, forInvitee: true });
    expect(() => parseSynthesisResponse(invalid)).toThrow();
  });

  test("JSON with extra fields still extracts forInitiator and forInvitee", () => {
    const withExtras = JSON.stringify({
      forInitiator: "initiator text",
      forInvitee: "invitee text",
      extraField: "should be ignored",
    });
    const result = parseSynthesisResponse(withExtras);
    expect(result.forInitiator).toBe("initiator text");
    expect(result.forInvitee).toBe("invitee text");
  });

  test("JSON wrapped in markdown code fence is handled", () => {
    const fenced = "```json\n" + VALID_SYNTHESIS_JSON + "\n```";
    const result = parseSynthesisResponse(fenced);
    expect(result).toHaveProperty("forInitiator");
    expect(result).toHaveProperty("forInvitee");
  });
});

// ---------------------------------------------------------------------------
// AC 6: Synthesis texts written to partyStates.synthesisText + synthesisGeneratedAt
// ---------------------------------------------------------------------------
describe("AC6: Synthesis texts are written to partyStates", () => {
  test("writeSynthesisResults patches both partyStates with synthesisText and synthesisGeneratedAt", async () => {
    const mockPatch = vi.fn();
    const mockGet = vi.fn().mockResolvedValue({
      _id: "cases:abc123",
      initiatorPartyStateId: "partyStates:initPS",
      inviteePartyStateId: "partyStates:invPS",
      status: "BOTH_PRIVATE_COACHING_COMPLETE",
    });
    const mockCtx = { db: { patch: mockPatch, get: mockGet } };

    const args = {
      caseId: "cases:abc123" as any,
      forInitiator: "Areas of agreement include communication goals.",
      forInvitee: "Both parties value the working relationship.",
    };

    // Call the mutation handler — supports both plain function and Convex mutation object
    const handler =
      typeof writeSynthesisResults === "function"
        ? writeSynthesisResults
        : writeSynthesisResults.handler;
    await handler(mockCtx as any, args);

    // Collect all patch calls and verify both partyState IDs received patches
    const patchCalls = mockPatch.mock.calls;
    const initPatch = patchCalls.find(
      (call: any[]) => call[0] === "partyStates:initPS",
    );
    const invPatch = patchCalls.find(
      (call: any[]) => call[0] === "partyStates:invPS",
    );

    // Initiator partyState must have synthesisText + synthesisGeneratedAt
    expect(initPatch).toBeDefined();
    expect(initPatch![1]).toMatchObject({
      synthesisText: args.forInitiator,
    });
    expect(initPatch![1]).toHaveProperty("synthesisGeneratedAt");
    expect(typeof initPatch![1].synthesisGeneratedAt).toBe("number");

    // Invitee partyState must have synthesisText + synthesisGeneratedAt
    expect(invPatch).toBeDefined();
    expect(invPatch![1]).toMatchObject({
      synthesisText: args.forInvitee,
    });
    expect(invPatch![1]).toHaveProperty("synthesisGeneratedAt");
    expect(typeof invPatch![1].synthesisGeneratedAt).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// AC 7: Case status advances to READY_FOR_JOINT in same mutation
// ---------------------------------------------------------------------------
describe("AC7: Case status advances to READY_FOR_JOINT atomically with synthesis write", () => {
  test("writeSynthesisResults sets case status to READY_FOR_JOINT and updatedAt in the same call", async () => {
    const mockPatch = vi.fn();
    const mockGet = vi.fn().mockResolvedValue({
      _id: "cases:abc123",
      initiatorPartyStateId: "partyStates:initPS",
      inviteePartyStateId: "partyStates:invPS",
      status: "BOTH_PRIVATE_COACHING_COMPLETE",
    });
    const mockCtx = { db: { patch: mockPatch, get: mockGet } };

    const args = {
      caseId: "cases:abc123" as any,
      forInitiator: "Initiator synthesis text.",
      forInvitee: "Invitee synthesis text.",
    };

    const handler =
      typeof writeSynthesisResults === "function"
        ? writeSynthesisResults
        : writeSynthesisResults.handler;
    await handler(mockCtx as any, args);

    // Verify case was patched with READY_FOR_JOINT status and updatedAt
    const casePatch = mockPatch.mock.calls.find(
      (call: any[]) => call[0] === "cases:abc123",
    );
    expect(casePatch).toBeDefined();
    expect(casePatch![1]).toMatchObject({ status: "READY_FOR_JOINT" });
    expect(casePatch![1]).toHaveProperty("updatedAt");
    expect(typeof casePatch![1].updatedAt).toBe("number");

    // Atomicity: all writes (2 partyState patches + 1 case patch) happen
    // in this single mutation invocation — no separate function calls needed.
    // Verify all three patches occurred within this one handler call.
    const partyStatePatches = mockPatch.mock.calls.filter(
      (call: any[]) =>
        call[0] === "partyStates:initPS" || call[0] === "partyStates:invPS",
    );
    expect(partyStatePatches).toHaveLength(2);
    expect(mockPatch).toHaveBeenCalledTimes(3); // 2 partyStates + 1 case
  });
});

// ---------------------------------------------------------------------------
// AC 8: Synthesis is one-shot, non-streaming per TechSpec TQ3
// ---------------------------------------------------------------------------
describe("AC8: Synthesis is one-shot, non-streaming", () => {
  test("generate action calls Anthropic SDK create() without stream option", async () => {
    // Reset the module-level mock so we can inspect calls from this test
    mockCreate.mockClear();

    // Build a minimal action context. The handler issues runQuery calls in
    // this order: enforceCostBudget()._getCaseAiUsage, _getCase,
    // _getPartyStates, _getAllPrivateMessages. Earlier versions of this
    // test used .mockResolvedValueOnce-chained values that broke when the
    // cost-budget query was added. Switch to a discriminator that inspects
    // the query function ref and returns shape-correct data per call —
    // resilient to additional internal queries appearing in the handler.
    const partyStatesData = [
      {
        _id: "partyStates:initPS",
        role: "INITIATOR",
        userId: "users:initUser",
      },
      {
        _id: "partyStates:invPS",
        role: "INVITEE",
        userId: "users:invUser",
      },
    ];
    const caseData = {
      _id: "cases:abc123",
      status: "BOTH_PRIVATE_COACHING_COMPLETE",
      initiatorPartyStateId: "partyStates:initPS",
      inviteePartyStateId: "partyStates:invPS",
    };
    const mockRunMutation = vi.fn();
    // Dispatch by identity against the imported function refs. The convex
    // proxy refs throw on String() coercion, so don't stringify them.
    const mockRunQuery = vi.fn(async (queryRef: unknown) => {
      if (queryRef === _getCase) return caseData;
      if (queryRef === _getPartyStates) return partyStatesData;
      if (queryRef === _getAllPrivateMessages) return [];
      // enforceCostBudget calls _getCaseAiUsage — return a no-usage row so
      // the cost gate doesn't short-circuit before generation.
      return { totalCostUsd: 0, totalInputTokens: 0, totalOutputTokens: 0 };
    });
    const mockActionCtx = {
      runMutation: mockRunMutation,
      runQuery: mockRunQuery,
    };

    // generateSynthesis is the action that calls the Anthropic SDK.
    // It should be exported from convex/synthesis/generate.ts.
    const handler =
      typeof generateSynthesis === "function"
        ? generateSynthesis
        : (generateSynthesis.handler ?? generateSynthesis);

    // The handler may throw downstream of messages.create (e.g. on a missing
    // privacy filter shape) — that's OK. We only care that it reached the
    // SDK call and used the non-streaming shape. AC8 is about "stream"
    // never being passed, so subsequent failure paths don't invalidate it.
    try {
      await handler(mockActionCtx as any, { caseId: "cases:abc123" as any });
    } catch {
      /* handler reached the SDK before failing — assertion below verifies */
    }

    // The mocked Anthropic SDK's messages.create must have been called
    expect(mockCreate).toHaveBeenCalled();

    // Verify that NO call to messages.create included stream: true
    for (const call of mockCreate.mock.calls) {
      const callArgs = call[0];
      expect(callArgs).not.toHaveProperty("stream");
    }
  });
});

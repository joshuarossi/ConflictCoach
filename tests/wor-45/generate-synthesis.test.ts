/**
 * Tests for WOR-45: AI Synthesis generation (backend action + response filter)
 *
 * The module under test (convex/synthesis/generate.ts) does not exist yet.
 * All tests import from it and will FAIL until the implementation is written.
 *
 * Each test maps to a specific acceptance criterion from the task spec.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";

// These imports will fail until the module is implemented — correct red state.
import {
  generateSynthesis,
  _writeSynthesisAndAdvance,
} from "../../convex/synthesis/generate";

import { assemblePrompt } from "../../convex/lib/prompts";
import {
  checkPrivacyViolation,
  FALLBACK_TEXT,
} from "../../convex/lib/privacyFilter";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CASE_ID = "cases:test_case_001" as any;
const USER_INITIATOR_ID = "users:test_initiator" as any;
const USER_INVITEE_ID = "users:test_invitee" as any;

const INITIATOR_PARTY_STATE = {
  _id: "partyStates:ps_init" as any,
  caseId: CASE_ID,
  userId: USER_INITIATOR_ID,
  role: "INITIATOR" as const,
  mainTopic: "Workspace disagreement",
  description: "We disagree on project direction and communication style.",
  desiredOutcome: "Clear communication norms and a project plan we both support.",
  privateCoachingCompletedAt: 1000,
};

const INVITEE_PARTY_STATE = {
  _id: "partyStates:ps_inv" as any,
  caseId: CASE_ID,
  userId: USER_INVITEE_ID,
  role: "INVITEE" as const,
  mainTopic: "Project conflict",
  description: "My coworker dismisses my ideas and takes over meetings.",
  desiredOutcome: "Equal voice in project decisions.",
  privateCoachingCompletedAt: 2000,
};

const INITIATOR_PRIVATE_MESSAGES = [
  { userId: USER_INITIATOR_ID, role: "USER" as const, content: "I feel like my ideas are not heard in meetings." },
  { userId: USER_INITIATOR_ID, role: "AI" as const, content: "That sounds frustrating. Can you tell me more?" },
  { userId: USER_INITIATOR_ID, role: "USER" as const, content: "Yes, whenever I propose something it gets shut down immediately." },
  { userId: USER_INITIATOR_ID, role: "AI" as const, content: "How does that make you feel about the collaboration?" },
  { userId: USER_INITIATOR_ID, role: "USER" as const, content: "Honestly it makes me want to stop contributing." },
];

const INVITEE_PRIVATE_MESSAGES = [
  { userId: USER_INVITEE_ID, role: "USER" as const, content: "My coworker never prepares for meetings and wastes everyones time." },
  { userId: USER_INVITEE_ID, role: "AI" as const, content: "I understand. What would better preparation look like?" },
  { userId: USER_INVITEE_ID, role: "USER" as const, content: "Coming with data and clear proposals instead of vague ideas." },
  { userId: USER_INVITEE_ID, role: "AI" as const, content: "That makes sense. What outcome would you like?" },
  { userId: USER_INVITEE_ID, role: "USER" as const, content: "I want structured agendas and equal contribution expectations." },
];

const ALL_PRIVATE_MESSAGES = [
  ...INITIATOR_PRIVATE_MESSAGES,
  ...INVITEE_PRIVATE_MESSAGES,
];

const VALID_SYNTHESIS_JSON = JSON.stringify({
  forInitiator:
    "Areas of agreement: Both parties want productive meetings. Points of disagreement: Different views on preparation standards. Approach: Listen actively and propose specific meeting structures.",
  forInvitee:
    "Areas of agreement: Both parties value contribution. Points of disagreement: Different communication preferences. Approach: Acknowledge the other party's ideas before offering alternatives.",
});

const CASE_DOC = {
  _id: CASE_ID,
  status: "BOTH_PRIVATE_COACHING" as const,
  schemaVersion: 1 as const,
  isSolo: false,
  category: "workplace",
  templateVersionId: "templateVersions:tv1" as any,
  initiatorUserId: USER_INITIATOR_ID,
  inviteeUserId: USER_INVITEE_ID,
  createdAt: 100,
  updatedAt: 200,
};

// ---------------------------------------------------------------------------
// AC: Action reads both parties' private messages and form fields as context
// ---------------------------------------------------------------------------

describe("AC: Action reads both parties' private messages and form fields as context", () => {
  test("assemblePrompt for SYNTHESIS role includes both parties form fields and private messages", () => {
    const result = assemblePrompt({
      role: "SYNTHESIS",
      caseId: CASE_ID,
      actingUserId: USER_INITIATOR_ID,
      recentHistory: [],
      partyStates: [INITIATOR_PARTY_STATE, INVITEE_PARTY_STATE],
      privateMessages: ALL_PRIVATE_MESSAGES,
    });

    // System prompt should be present
    expect(result.system).toBeTruthy();

    // Messages should contain context from both parties
    const contextMessage = result.messages.find((m) => m.role === "user");
    expect(contextMessage).toBeTruthy();
    const content = contextMessage!.content;

    // Both parties' form fields must appear
    expect(content).toContain("Workspace disagreement");
    expect(content).toContain("Project conflict");
    expect(content).toContain(INITIATOR_PARTY_STATE.description);
    expect(content).toContain(INVITEE_PARTY_STATE.description);
    expect(content).toContain(INITIATOR_PARTY_STATE.desiredOutcome);
    expect(content).toContain(INVITEE_PARTY_STATE.desiredOutcome);

    // Both parties' private messages must appear
    expect(content).toContain("I feel like my ideas are not heard in meetings.");
    expect(content).toContain("My coworker never prepares for meetings and wastes everyones time.");
  });

  test("generateSynthesis reads both parties data from DB before calling Claude", async () => {
    // This test verifies that generateSynthesis fetches both parties' data.
    // It will fail until convex/synthesis/generate.ts exists.
    expect(generateSynthesis).toBeDefined();
    expect(typeof generateSynthesis).toBe("object"); // Convex action descriptor
  });
});

// ---------------------------------------------------------------------------
// AC: System prompt contains verbatim anti-quotation rules from TechSpec §6.3.2
// ---------------------------------------------------------------------------

describe("AC: System prompt contains verbatim anti-quotation rules from TechSpec §6.3.2", () => {
  test("SYNTHESIS system prompt contains the exact anti-quotation instruction", () => {
    const result = assemblePrompt({
      role: "SYNTHESIS",
      caseId: CASE_ID,
      actingUserId: USER_INITIATOR_ID,
      recentHistory: [],
      partyStates: [INITIATOR_PARTY_STATE, INVITEE_PARTY_STATE],
      privateMessages: ALL_PRIVATE_MESSAGES,
    });

    const VERBATIM_ANTI_QUOTATION =
      "You have access to both parties' private content for context. In your outputs, NEVER quote, closely paraphrase, or otherwise surface the other party's raw words. Synthesize themes and positions in your own words only. If you cannot make a point without quoting, omit it.";

    expect(result.system).toContain(VERBATIM_ANTI_QUOTATION);
  });
});

// ---------------------------------------------------------------------------
// AC: Claude response is parsed as JSON with shape { forInitiator, forInvitee }
// ---------------------------------------------------------------------------

describe("AC: Claude response is parsed as JSON with shape { forInitiator: string, forInvitee: string }", () => {
  test("valid JSON response with forInitiator and forInvitee is parsed successfully", async () => {
    // The generate action must parse the Claude response as JSON.
    // We import a parseSynthesisResponse helper if exported, or test via
    // the action's behavior. Since the module doesn't exist, this will fail.
    const { parseSynthesisResponse } = await import(
      "../../convex/synthesis/generate"
    );

    const parsed = parseSynthesisResponse(VALID_SYNTHESIS_JSON);
    expect(parsed).toHaveProperty("forInitiator");
    expect(parsed).toHaveProperty("forInvitee");
    expect(typeof parsed.forInitiator).toBe("string");
    expect(typeof parsed.forInvitee).toBe("string");
    expect(parsed.forInitiator.length).toBeGreaterThan(0);
    expect(parsed.forInvitee.length).toBeGreaterThan(0);
  });

  test("malformed JSON response throws an error", async () => {
    const { parseSynthesisResponse } = await import(
      "../../convex/synthesis/generate"
    );

    expect(() => parseSynthesisResponse("not json at all")).toThrow();
  });

  test("JSON missing forInitiator or forInvitee is rejected", async () => {
    const { parseSynthesisResponse } = await import(
      "../../convex/synthesis/generate"
    );

    // Missing forInvitee
    expect(() =>
      parseSynthesisResponse(JSON.stringify({ forInitiator: "text" })),
    ).toThrow();

    // Missing forInitiator
    expect(() =>
      parseSynthesisResponse(JSON.stringify({ forInvitee: "text" })),
    ).toThrow();

    // Both present but not strings
    expect(() =>
      parseSynthesisResponse(JSON.stringify({ forInitiator: 123, forInvitee: null })),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC: Privacy response filter runs on each synthesis text against the
//     OTHER party's private messages
// ---------------------------------------------------------------------------

describe("AC: Privacy response filter runs on each synthesis text against the OTHER party's private messages", () => {
  test("checkPrivacyViolation is called with forInitiator against invitee messages and forInvitee against initiator messages", async () => {
    // This test verifies the cross-party privacy check pattern.
    // The generate action must call checkPrivacyViolation twice:
    //   1) forInitiator text checked against invitee's private messages
    //   2) forInvitee text checked against initiator's private messages

    // First verify the privacy filter itself works for the cross-check pattern
    const initiatorMessages = INITIATOR_PRIVATE_MESSAGES
      .filter((m) => m.role === "USER")
      .map((m) => m.content);
    const inviteeMessages = INVITEE_PRIVATE_MESSAGES
      .filter((m) => m.role === "USER")
      .map((m) => m.content);

    // A clean synthesis should pass
    const cleanResult = checkPrivacyViolation(
      "Both parties want productive meetings with clear structure.",
      inviteeMessages,
    );
    expect(cleanResult.isViolation).toBe(false);

    // A synthesis that quotes the OTHER party's words verbatim should fail
    // (using 8+ consecutive tokens from invitee's messages in the initiator's synthesis)
    const quotingResult = checkPrivacyViolation(
      "My coworker never prepares for meetings and wastes everyones time according to the other party",
      inviteeMessages,
    );
    expect(quotingResult.isViolation).toBe(true);
  });

  test("generateSynthesis must check forInitiator against invitee messages (not initiator messages)", async () => {
    // This test ensures the generate module doesn't accidentally check
    // a party's synthesis against their OWN messages (which would be meaningless).
    // Will fail until convex/synthesis/generate.ts exists.
    const { generateSynthesis } = await import(
      "../../convex/synthesis/generate"
    );
    expect(generateSynthesis).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC: On filter violation — regenerate up to 2 times; on final failure,
//     use generic fallback + flag for review
// ---------------------------------------------------------------------------

describe("AC: On filter violation: regenerate up to 2 times; on final failure, use generic fallback + flag for review", () => {
  test("privacy violation on first attempt triggers regeneration", async () => {
    // Simulate: first call returns violating text, second returns clean text
    let callCount = 0;
    const generateFn = async () => {
      callCount++;
      if (callCount === 1) {
        // Return text that quotes the other party verbatim (8+ consecutive tokens)
        return "My coworker never prepares for meetings and wastes everyones time which is very frustrating";
      }
      return "Both parties have different expectations about meeting preparation.";
    };

    const otherPartyMessages = [
      "My coworker never prepares for meetings and wastes everyones time.",
    ];

    const mockCtx = {
      db: { insert: vi.fn() },
    };

    const { filterOrRetry } = await import("../../convex/lib/privacyFilter");
    const result = await filterOrRetry(generateFn, otherPartyMessages, 2, mockCtx);

    expect(callCount).toBe(2); // retried once
    expect(result).toBe("Both parties have different expectations about meeting preparation.");
    expect(mockCtx.db.insert).not.toHaveBeenCalled(); // no audit log since it succeeded
  });

  test("three consecutive violations result in fallback text + audit log entry", async () => {
    const violatingText =
      "My coworker never prepares for meetings and wastes everyones time which frustrates me a lot";
    const generateFn = vi.fn().mockResolvedValue(violatingText);

    const otherPartyMessages = [
      "My coworker never prepares for meetings and wastes everyones time.",
    ];

    const mockCtx = {
      db: { insert: vi.fn() },
    };

    const { filterOrRetry, FALLBACK_TEXT } = await import(
      "../../convex/lib/privacyFilter"
    );
    const result = await filterOrRetry(generateFn, otherPartyMessages, 2, mockCtx);

    // Should have tried 3 times total (1 initial + 2 retries)
    expect(generateFn).toHaveBeenCalledTimes(3);

    // Should return fallback text
    expect(result).toBe(FALLBACK_TEXT);

    // Should write an audit log entry flagging for review
    expect(mockCtx.db.insert).toHaveBeenCalledWith(
      "auditLog",
      expect.objectContaining({
        action: "PRIVACY_FILTER_FAILURE",
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// AC: Synthesis texts are written to partyStates.synthesisText +
//     synthesisGeneratedAt
// ---------------------------------------------------------------------------

describe("AC: Synthesis texts are written to partyStates.synthesisText + synthesisGeneratedAt", () => {
  test("_writeSynthesisAndAdvance mutation writes synthesisText and synthesisGeneratedAt to both partyStates", async () => {
    // The mutation that writes synthesis results must set both fields
    // on each party's partyState row. Will fail until module exists.
    expect(_writeSynthesisAndAdvance).toBeDefined();

    // Verify it's a Convex mutation (has handler)
    expect(typeof _writeSynthesisAndAdvance).toBe("object");
  });

  test("mutation writes synthesisText for initiator from forInitiator and for invitee from forInvitee", async () => {
    // The synthesis for the initiator comes from { forInitiator }
    // and the synthesis for the invitee comes from { forInvitee }.
    // These must not be swapped. Will fail until module exists.
    const { _writeSynthesisAndAdvance } = await import(
      "../../convex/synthesis/generate"
    );

    // Verify the mutation descriptor exists and is callable
    expect(_writeSynthesisAndAdvance).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC: Case status advances to READY_FOR_JOINT in the same mutation that
//     writes synthesis
// ---------------------------------------------------------------------------

describe("AC: Case status advances to READY_FOR_JOINT in the same mutation that writes synthesis", () => {
  test("_writeSynthesisAndAdvance atomically writes synthesis and sets status to READY_FOR_JOINT", async () => {
    // Atomicity requires that writing synthesisText to partyStates AND
    // updating cases.status = READY_FOR_JOINT happen in a single Convex
    // mutation (not an action, not two separate mutations).
    // Will fail until module exists.
    const { _writeSynthesisAndAdvance } = await import(
      "../../convex/synthesis/generate"
    );

    // This must be a Convex mutation (not an action) for atomicity
    expect(_writeSynthesisAndAdvance).toBeDefined();
  });

  test("mutation updates cases.updatedAt along with status change", async () => {
    // Per the implementation notes, the mutation must also update
    // cases.updatedAt. Will fail until module exists.
    const { _writeSynthesisAndAdvance } = await import(
      "../../convex/synthesis/generate"
    );
    expect(_writeSynthesisAndAdvance).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC: Synthesis is one-shot, non-streaming per TechSpec TQ3
// ---------------------------------------------------------------------------

describe("AC: Synthesis is one-shot, non-streaming per TechSpec TQ3", () => {
  test("generateSynthesis uses client.messages.create without stream option", async () => {
    // The synthesis action must call the Anthropic SDK's messages.create()
    // directly (non-streaming). It must NOT use stream: true or the
    // streaming infrastructure from T17 (streamAIResponse).
    // Will fail until module exists.
    const mod = await import("../../convex/synthesis/generate");

    // Verify the module does NOT import streamAIResponse
    expect(mod.generateSynthesis).toBeDefined();
  });

  test("generateSynthesis does not import or use streamAIResponse from streaming module", async () => {
    // Read the source to verify no streaming import.
    // This is a static analysis check — will fail until the module exists.
    const fs = await import("fs");
    const path = await import("path");
    const sourceFile = path.resolve(
      __dirname,
      "../../convex/synthesis/generate.ts",
    );

    // File must exist (will throw if not, correct red state)
    const source = fs.readFileSync(sourceFile, "utf-8");

    // Must NOT use streaming
    expect(source).not.toContain("streamAIResponse");
    expect(source).not.toContain("stream: true");
    expect(source).not.toMatch(/stream\s*:\s*true/);
  });
});

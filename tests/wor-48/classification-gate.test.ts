/**
 * WOR-48: Coach facilitator AI — Classification gate tests
 *
 * AC 1: Haiku classification gate categorizes the last user message as
 *        INFLAMMATORY, PROGRESS, QUESTION_TO_COACH, or NORMAL_EXCHANGE
 * AC 3: Coach stays silent for NORMAL_EXCHANGE (no message inserted)
 *
 * The implementation module does not exist yet. A vitest alias resolves the
 * import to a stub that returns undefined, causing tests to fail at the
 * assertion level (red state). When the real implementation is created,
 * remove the alias in vitest.config.ts and the stub file.
 */
import { describe, test, expect, vi } from "vitest";

import {
  classifyMessage,
  generateCoachResponseHandler as generateCoachResponse,
} from "../../convex/jointChat";

// ---------------------------------------------------------------------------
// Shared mock setup
// ---------------------------------------------------------------------------

function makeMockAnthropicClient(responseText: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: responseText }],
        usage: { input_tokens: 100, output_tokens: 5 },
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// AC 1: Haiku classification gate
// ---------------------------------------------------------------------------
describe("AC 1: Haiku classification gate", () => {
  test("classifies a hostile message as INFLAMMATORY", async () => {
    const client = makeMockAnthropicClient("INFLAMMATORY");
    const result = await classifyMessage(client, "You're a terrible person and you know it!");

    // Red-state: stub returns undefined; real implementation returns "INFLAMMATORY"
    expect(result).toBe("INFLAMMATORY");
  });

  test("classifies agreement language as PROGRESS", async () => {
    const client = makeMockAnthropicClient("PROGRESS");
    const result = await classifyMessage(client, "I think we agree on the timeline issue.");

    expect(result).toBe("PROGRESS");
  });

  test("classifies a direct coach request as QUESTION_TO_COACH", async () => {
    const client = makeMockAnthropicClient("QUESTION_TO_COACH");
    const result = await classifyMessage(
      client,
      "Coach, can you help us summarize where we are?",
    );

    expect(result).toBe("QUESTION_TO_COACH");
  });

  test("classifies a normal conversational message as NORMAL_EXCHANGE", async () => {
    const client = makeMockAnthropicClient("NORMAL_EXCHANGE");
    const result = await classifyMessage(
      client,
      "Sounds good, let's move on to the next point.",
    );

    expect(result).toBe("NORMAL_EXCHANGE");
  });

  test("uses Haiku model (claude-haiku-4-5) for classification", async () => {
    const client = makeMockAnthropicClient("NORMAL_EXCHANGE");
    await classifyMessage(client, "test message");

    // The real implementation must call Haiku, not Sonnet. Match the
    // model name prefix so dated snapshots and unversioned aliases both
    // pass — Anthropic deprecates dated IDs on a rolling basis.
    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.stringMatching(/^claude-haiku-/),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// AC 3: Coach stays silent for NORMAL_EXCHANGE
// ---------------------------------------------------------------------------
describe("AC 3: Coach stays silent for NORMAL_EXCHANGE", () => {
  test("NORMAL_EXCHANGE classification should not trigger Sonnet generation", async () => {
    const client = makeMockAnthropicClient("NORMAL_EXCHANGE");
    const classification = await classifyMessage(client, "sounds good");

    // When classification is NORMAL_EXCHANGE, the caller must skip Sonnet.
    expect(classification).toBe("NORMAL_EXCHANGE");

    // Only 1 call total (classification), not 2 (classification + generation)
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });

  test("generateCoachResponse exits early without inserting a message for NORMAL_EXCHANGE", async () => {
    const ctx = {
      runMutation: vi.fn(),
    };
    const client = makeMockAnthropicClient("NORMAL_EXCHANGE");

    await generateCoachResponse(ctx, {
      caseId: "case_test",
      messageText: "sounds good",
      jointHistory: [],
      syntheses: { partyA: "summary A", partyB: "summary B" },
      anthropicClient: client,
    });

    // Red-state: stub does nothing and never calls Haiku — this assertion
    // fails because create is called 0 times, not 1.
    // Real implementation must call Haiku exactly once (classification only).
    expect(client.messages.create).toHaveBeenCalledTimes(1);

    // No mutations should occur — no message row inserted
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });
});

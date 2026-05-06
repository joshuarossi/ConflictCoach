/**
 * WOR-48: Coach facilitator AI — Streaming pattern tests
 *
 * AC 8: Streaming response follows the standard streaming infrastructure pattern
 *
 * The implementation module does not exist yet. A vitest alias resolves the
 * import to a stub that returns undefined/no-ops, causing tests to fail at the
 * assertion level (red state). When the real implementation is created,
 * remove the alias in vitest.config.ts and the stub file.
 */
import { describe, test, expect, vi } from "vitest";

import { generateCoachResponseHandler as generateCoachResponse } from "../../convex/jointChat";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock Convex action context that records runMutation calls. */
function makeMockCtx() {
  const mutations: Array<{ ref: unknown; args: Record<string, unknown> }> = [];
  return {
    mutations,
    runMutation: vi.fn(async (ref: unknown, args: Record<string, unknown>) => {
      mutations.push({ ref, args });
      // Return a fake message ID on first insert
      if (args.status === "STREAMING") return "msg_test_123";
    }),
  };
}

/** Build a mock Anthropic client where Haiku returns a classification and Sonnet streams tokens. */
function makeMockAnthropicClient(classification: string) {
  const callCount = { value: 0 };
  return {
    messages: {
      // Non-streaming call used by Haiku classification gate
      create: vi.fn().mockImplementation(async () => {
        callCount.value++;
        return {
          content: [{ type: "text", text: classification }],
          usage: { input_tokens: 50, output_tokens: 5 },
        };
      }),
      // Streaming call used by Sonnet response generation
      stream: vi.fn().mockImplementation(() => {
        const events = [
          {
            type: "message_start",
            message: { usage: { input_tokens: 100, output_tokens: 0 } },
          },
          {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "I hear you." },
          },
          {
            type: "message_delta",
            usage: { output_tokens: 10 },
            delta: { stop_reason: "end_turn" },
          },
        ];
        let idx = 0;
        return {
          [Symbol.asyncIterator]() {
            return {
              async next() {
                if (idx < events.length)
                  return { value: events[idx++], done: false };
                return { value: undefined, done: true };
              },
            };
          },
        };
      }),
    },
    _callCount: callCount,
  };
}

// ---------------------------------------------------------------------------
// AC 8: Streaming follows the standard streaming infrastructure pattern
// ---------------------------------------------------------------------------
describe("AC 8: Streaming response follows standard infrastructure pattern", () => {
  test("message row is inserted with status=STREAMING then updated to COMPLETE", async () => {
    const ctx = makeMockCtx();
    const client = makeMockAnthropicClient("QUESTION_TO_COACH");

    await generateCoachResponse(ctx, {
      caseId: "case_test",
      messageText: "Coach, can you help?",
      jointHistory: [],
      syntheses: { partyA: "summary A", partyB: "summary B" },
      anthropicClient: client,
    });

    // Must have at least two message-row mutations: initial STREAMING insert
    // + final COMPLETE update. Filter for message rows specifically — the
    // handler also issues a non-message AI-usage record mutation that
    // shouldn't be confused with the final COMPLETE write.
    const messageMutations = ctx.mutations.filter(
      (m) => m.args.status === "STREAMING" || m.args.status === "COMPLETE",
    );
    expect(messageMutations.length).toBeGreaterThanOrEqual(2);

    expect(messageMutations[0].args.status).toBe("STREAMING");
    expect(messageMutations[messageMutations.length - 1].args.status).toBe(
      "COMPLETE",
    );
  });

  test("token count is recorded on the final COMPLETE message", async () => {
    const ctx = makeMockCtx();
    const client = makeMockAnthropicClient("INFLAMMATORY");

    await generateCoachResponse(ctx, {
      caseId: "case_test",
      messageText: "You're awful!",
      jointHistory: [],
      syntheses: { partyA: "summary A", partyB: "summary B" },
      anthropicClient: client,
    });

    // Find the COMPLETE message mutation (handler also writes a separate
    // AI-usage record that has no status field).
    const completeMutation = ctx.mutations.find(
      (m) => m.args.status === "COMPLETE",
    );
    expect(completeMutation).toBeDefined();
    expect(completeMutation!.args.tokens).toBeDefined();
    expect(typeof completeMutation!.args.tokens).toBe("number");
    expect(completeMutation!.args.tokens as number).toBeGreaterThan(0);
  });

  test("streaming writes to the jointMessages table", async () => {
    const ctx = makeMockCtx();
    const client = makeMockAnthropicClient("PROGRESS");

    await generateCoachResponse(ctx, {
      caseId: "case_test",
      messageText: "We agree on the timeline.",
      jointHistory: [],
      syntheses: { partyA: "summary A", partyB: "summary B" },
      anthropicClient: client,
    });

    // Find the initial STREAMING insert (always the first message-row write).
    const insertMutation = ctx.mutations.find(
      (m) => m.args.status === "STREAMING",
    );
    expect(insertMutation).toBeDefined();
    expect(insertMutation!.args.table).toBe("jointMessages");
  });
});

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

import { generateCoachResponse } from "../../convex/jointChat/generateCoachResponse";

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
          { type: "message_start", message: { usage: { input_tokens: 100, output_tokens: 0 } } },
          { type: "content_block_delta", delta: { type: "text_delta", text: "I hear you." } },
          { type: "message_delta", usage: { output_tokens: 10 }, delta: { stop_reason: "end_turn" } },
        ];
        let idx = 0;
        return {
          [Symbol.asyncIterator]() {
            return {
              async next() {
                if (idx < events.length) return { value: events[idx++], done: false };
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

    // Must have at least two mutations: initial STREAMING insert + final COMPLETE update
    expect(ctx.mutations.length).toBeGreaterThanOrEqual(2);

    const firstMutation = ctx.mutations[0];
    expect(firstMutation.args.status).toBe("STREAMING");

    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args.status).toBe("COMPLETE");
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

    // Must have recorded at least one mutation
    expect(ctx.mutations.length).toBeGreaterThan(0);

    // The last mutation (COMPLETE) must include a token count
    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args.status).toBe("COMPLETE");
    expect(lastMutation.args.tokens).toBeDefined();
    expect(typeof lastMutation.args.tokens).toBe("number");
    expect(lastMutation.args.tokens).toBeGreaterThan(0);
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

    // Must have recorded at least one mutation
    expect(ctx.mutations.length).toBeGreaterThan(0);

    // The initial insert mutation must target jointMessages
    const insertMutation = ctx.mutations[0];
    expect(insertMutation.args.table).toBe("jointMessages");
  });
});

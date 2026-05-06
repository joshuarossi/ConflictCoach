/**
 * WOR-48: Coach facilitator AI — Response generation tests
 *
 * AC 2: Coach generates a response for INFLAMMATORY, PROGRESS, and
 *        QUESTION_TO_COACH triggers
 * AC 7: Coach messages have authorType=COACH, isIntervention=true for
 *        inflammatory responses
 *
 * The implementation module does not exist yet. A vitest alias resolves the
 * import to a stub that returns undefined, causing tests to fail at the
 * assertion level (red state). When the real implementation is created,
 * remove the alias in vitest.config.ts and the stub file.
 */
import { describe, test, expect, vi } from "vitest";

import {
  CLASSIFICATIONS_REQUIRING_RESPONSE,
  getIsIntervention,
  generateCoachResponseHandler as generateCoachResponse,
} from "../../convex/jointChat";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockCtx() {
  const mutations: Array<{ ref: unknown; args: Record<string, unknown> }> = [];
  return {
    mutations,
    runMutation: vi.fn(async (ref: unknown, args: Record<string, unknown>) => {
      mutations.push({ ref, args });
      if (args.status === "STREAMING") return "msg_test_456";
    }),
  };
}

function makeMockAnthropicClient(classification: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: classification }],
        usage: { input_tokens: 50, output_tokens: 5 },
      }),
      stream: vi.fn().mockImplementation(() => {
        const events = [
          {
            type: "message_start",
            message: { usage: { input_tokens: 100, output_tokens: 0 } },
          },
          {
            type: "content_block_delta",
            delta: { type: "text_delta", text: "Let me help." },
          },
          {
            type: "message_delta",
            usage: { output_tokens: 8 },
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
  };
}

// ---------------------------------------------------------------------------
// AC 2: Coach generates response for non-NORMAL classifications
// ---------------------------------------------------------------------------
describe("AC 2: Coach generates response for INFLAMMATORY, PROGRESS, QUESTION_TO_COACH", () => {
  test("CLASSIFICATIONS_REQUIRING_RESPONSE is exported and includes all three trigger types", () => {
    // Red-state: stub returns undefined; real implementation should export this array
    expect(CLASSIFICATIONS_REQUIRING_RESPONSE).toBeDefined();
    expect(CLASSIFICATIONS_REQUIRING_RESPONSE).toContain("INFLAMMATORY");
    expect(CLASSIFICATIONS_REQUIRING_RESPONSE).toContain("PROGRESS");
    expect(CLASSIFICATIONS_REQUIRING_RESPONSE).toContain("QUESTION_TO_COACH");
  });

  test("NORMAL_EXCHANGE is NOT in the set of classifications requiring response", () => {
    expect(CLASSIFICATIONS_REQUIRING_RESPONSE).toBeDefined();
    expect(CLASSIFICATIONS_REQUIRING_RESPONSE).not.toContain("NORMAL_EXCHANGE");
  });

  test("QUESTION_TO_COACH classification inserts a jointMessages row with authorType=COACH", async () => {
    const ctx = makeMockCtx();
    const client = makeMockAnthropicClient("QUESTION_TO_COACH");

    await generateCoachResponse(ctx, {
      caseId: "case_test",
      messageText: "Coach, can you help us?",
      jointHistory: [],
      syntheses: { partyA: "summary A", partyB: "summary B" },
      anthropicClient: client,
    });

    // Red-state: stub does nothing, so no mutations are recorded → assertion fails
    expect(ctx.runMutation).toHaveBeenCalled();

    const insertMutation = ctx.mutations.find(
      (m) => m.args.status === "STREAMING",
    );
    expect(insertMutation).toBeDefined();
    expect(insertMutation!.args.authorType).toBe("COACH");
    expect(insertMutation!.args.table).toBe("jointMessages");
  });
});

// ---------------------------------------------------------------------------
// AC 7: Coach message metadata — isIntervention flag
// ---------------------------------------------------------------------------
describe("AC 7: Coach message metadata — isIntervention flag", () => {
  test("INFLAMMATORY classification produces isIntervention=true", () => {
    // Red-state: stub returns undefined; real implementation should export this helper
    expect(getIsIntervention).toBeDefined();
    expect(typeof getIsIntervention).toBe("function");
    expect(getIsIntervention("INFLAMMATORY")).toBe(true);
  });

  test("PROGRESS classification produces isIntervention=false", () => {
    expect(typeof getIsIntervention).toBe("function");
    expect(getIsIntervention("PROGRESS")).toBe(false);
  });

  test("QUESTION_TO_COACH classification produces isIntervention=false", () => {
    expect(typeof getIsIntervention).toBe("function");
    expect(getIsIntervention("QUESTION_TO_COACH")).toBe(false);
  });

  test("INFLAMMATORY coach message is inserted with isIntervention=true", async () => {
    const ctx = makeMockCtx();
    const client = makeMockAnthropicClient("INFLAMMATORY");

    await generateCoachResponse(ctx, {
      caseId: "case_test",
      messageText: "You're terrible!",
      jointHistory: [],
      syntheses: { partyA: "summary A", partyB: "summary B" },
      anthropicClient: client,
    });

    // Red-state: stub does nothing → no mutations → assertion fails
    expect(ctx.runMutation).toHaveBeenCalled();

    const insertMutation = ctx.mutations.find(
      (m) => m.args.status === "STREAMING",
    );
    expect(insertMutation).toBeDefined();
    expect(insertMutation!.args.authorType).toBe("COACH");
    expect(insertMutation!.args.isIntervention).toBe(true);
  });
});

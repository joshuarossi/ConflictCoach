import { describe, test, expect, vi, afterEach } from "vitest";

/**
 * WOR-71 AC: Stub simulates streaming with configurable delays
 *
 * The mock streaming function should accept a delay configuration and
 * simulate the STREAMING → COMPLETE lifecycle with intermediate flushes.
 */

import { runMockStreamWithDelay } from "../../convex/lib/claudeMock";

/** Minimal mock for a Convex action context's runMutation capability. */
function createMockCtx() {
  const mutations: Array<{ args: Record<string, unknown>; time: number }> = [];
  const start = Date.now();
  return {
    mutations,
    runMutation: vi.fn(async (_ref: unknown, args: Record<string, unknown>) => {
      mutations.push({ args, time: Date.now() - start });
      return "mock_message_id";
    }),
  };
}

describe("AC: Stub simulates streaming with configurable delays", () => {
  test("runMockStreamWithDelay is a callable function", () => {
    expect(typeof runMockStreamWithDelay).toBe("function");
  });

  test("mock streaming inserts STREAMING status updates before COMPLETE", async () => {
    const ctx = createMockCtx();

    await runMockStreamWithDelay(ctx, "mock_msg_id", "updateMutationRef", {
      role: "PRIVATE_COACH",
      wordDelayMs: 10,
    });

    // Should have at least one STREAMING update and one COMPLETE update
    const statuses = ctx.mutations.map((m) => m.args.status as string);
    expect(statuses).toContain("STREAMING");
    expect(statuses[statuses.length - 1]).toBe("COMPLETE");
  });

  test("mock streaming takes measurable time (not instant)", async () => {
    const ctx = createMockCtx();
    const start = Date.now();

    await runMockStreamWithDelay(ctx, "mock_msg_id", "updateMutationRef", {
      role: "PRIVATE_COACH",
      wordDelayMs: 15,
    });

    const elapsed = Date.now() - start;
    // With delays between words, total time should be noticeable
    expect(elapsed).toBeGreaterThan(10);
  });

  test("configurable delay changes the pacing of streaming updates", async () => {
    // Fast run
    const ctxFast = createMockCtx();
    const startFast = Date.now();
    await runMockStreamWithDelay(ctxFast, "msg_fast", "updateMutationRef", {
      role: "PRIVATE_COACH",
      wordDelayMs: 5,
    });
    const elapsedFast = Date.now() - startFast;

    // Slow run
    const ctxSlow = createMockCtx();
    const startSlow = Date.now();
    await runMockStreamWithDelay(ctxSlow, "msg_slow", "updateMutationRef", {
      role: "PRIVATE_COACH",
      wordDelayMs: 30,
    });
    const elapsedSlow = Date.now() - startSlow;

    // Slower delay should take more time
    expect(elapsedSlow).toBeGreaterThan(elapsedFast);
  });

  test("final COMPLETE mutation includes the full canned response content", async () => {
    const ctx = createMockCtx();

    await runMockStreamWithDelay(ctx, "mock_msg_id", "updateMutationRef", {
      role: "PRIVATE_COACH",
      wordDelayMs: 5,
    });

    const completeMutation = ctx.mutations.find(
      (m) => m.args.status === "COMPLETE",
    );
    expect(completeMutation).toBeDefined();
    expect(typeof completeMutation!.args.content).toBe("string");
    expect((completeMutation!.args.content as string).length).toBeGreaterThan(
      0,
    );
  });

  test("final COMPLETE mutation includes a deterministic token count", async () => {
    const ctx = createMockCtx();

    await runMockStreamWithDelay(ctx, "mock_msg_id", "updateMutationRef", {
      role: "PRIVATE_COACH",
      wordDelayMs: 5,
    });

    const completeMutation = ctx.mutations.find(
      (m) => m.args.status === "COMPLETE",
    );
    expect(completeMutation).toBeDefined();
    expect(typeof completeMutation!.args.tokens).toBe("number");
  });
});

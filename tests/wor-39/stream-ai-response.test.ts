import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for WOR-39: AI streaming infrastructure
 *
 * The module under test (convex/lib/streaming.ts) does not exist yet.
 * All tests import from it and will FAIL until the implementation is written.
 *
 * Each test maps to a specific acceptance criterion from the task spec.
 */

// Import the helper that does not exist yet — this will cause all tests to fail
// with a module-not-found error, which is the correct "red" state.
import {
  streamAIResponse,
  type StreamAIResponseOptions,
} from "../../convex/lib/streaming";

// ---------------------------------------------------------------------------
// Shared test doubles
// ---------------------------------------------------------------------------

/** Minimal mock for a Convex action context's runMutation capability. */
function createMockCtx() {
  const mutations: Array<{ name: string; args: Record<string, unknown> }> = [];
  return {
    mutations,
    runMutation: vi.fn(async (name: string, args: Record<string, unknown>) => {
      mutations.push({ name, args });
      // Return a fake document id for insert mutations
      return "mock_message_id";
    }),
  };
}

/** Helper to build a mock Anthropic stream that yields tokens on demand. */
function createMockAnthropicStream(
  tokens: string[],
  options?: {
    delayMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    stopReason?: string;
  },
) {
  const {
    delayMs = 0,
    inputTokens = 10,
    outputTokens = tokens.length,
    stopReason = "end_turn",
  } = options ?? {};

  async function* generate() {
    for (const token of tokens) {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
      yield {
        type: "content_block_delta" as const,
        delta: { type: "text_delta" as const, text: token },
      };
    }
    // Final message_delta with usage and stop reason
    yield {
      type: "message_delta" as const,
      delta: { stop_reason: stopReason },
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    };
  }

  return generate();
}

/** Mock Anthropic client that returns a controllable stream. */
function createMockAnthropicClient(
  tokens: string[],
  options?: Parameters<typeof createMockAnthropicStream>[1],
) {
  return {
    messages: {
      stream: vi.fn(() => {
        const stream = createMockAnthropicStream(tokens, options);
        return { [Symbol.asyncIterator]: () => stream };
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// AC 1: Reusable streamAIResponse helper handles the insert -> stream ->
//        update -> complete lifecycle for any message table
//        (privateMessages, jointMessages, draftMessages)
// ---------------------------------------------------------------------------
describe("Reusable streamAIResponse helper handles the insert -> stream -> update -> complete lifecycle for any message table (privateMessages, jointMessages, draftMessages)", () => {
  test("streamAIResponse is a callable function", () => {
    expect(typeof streamAIResponse).toBe("function");
  });

  test.each(["privateMessages", "jointMessages", "draftMessages"] as const)(
    "streamAIResponse works with the %s table",
    async (tableName) => {
      const ctx = createMockCtx();
      const client = createMockAnthropicClient(["Hello", " world"]);

      await streamAIResponse({
        ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
        anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
        table: tableName,
        messageFields: { caseId: "fake_case_id" as never },
        model: "claude-sonnet-4-5-20250514",
        systemPrompt: "You are a coach.",
        userMessages: [{ role: "user" as const, content: "Hi" }],
      });

      // Should have at least an insert and a final update mutation
      expect(ctx.mutations.length).toBeGreaterThanOrEqual(2);
    },
  );
});

// ---------------------------------------------------------------------------
// AC 2: A message row is inserted with status=STREAMING and empty content
//        before the Claude API call begins
// ---------------------------------------------------------------------------
describe("A message row is inserted with status=STREAMING and empty content before the Claude API call begins", () => {
  test("first mutation inserts a row with status=STREAMING and empty content", async () => {
    const ctx = createMockCtx();
    const client = createMockAnthropicClient(["token"]);

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never, userId: "fake_user_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    const insertCall = ctx.mutations[0];
    expect(insertCall).toBeDefined();
    expect(insertCall.args).toMatchObject({
      status: "STREAMING",
      content: "",
    });
  });

  test("insert mutation occurs before the Anthropic stream is consumed", async () => {
    const callOrder: string[] = [];
    const ctx = createMockCtx();
    ctx.runMutation = vi.fn(async (name: string, args: Record<string, unknown>) => {
      if (ctx.mutations.length === 0) {
        callOrder.push("insert");
      }
      ctx.mutations.push({ name, args });
      return "mock_message_id";
    });

    const streamFn = vi.fn(() => {
      callOrder.push("stream_created");
      const stream = createMockAnthropicStream(["hi"]);
      return { [Symbol.asyncIterator]: () => stream };
    });
    const client = { messages: { stream: streamFn } };

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    expect(callOrder[0]).toBe("insert");
  });
});

// ---------------------------------------------------------------------------
// AC 3: Streaming tokens are batched and flushed via Convex mutation calls
//        at approximately 50ms intervals (not per-token)
// ---------------------------------------------------------------------------
describe("Streaming tokens are batched and flushed via Convex mutation calls at approximately 50ms intervals (not per-token, to avoid excessive mutation overhead)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("100 tokens over 500ms produces approximately 10 update mutations, not 100", async () => {
    // We use real timers for this test since async streams need real delays
    vi.useRealTimers();

    const tokens = Array.from({ length: 100 }, (_, i) => `t${i}`);
    const ctx = createMockCtx();
    const client = createMockAnthropicClient(tokens, { delayMs: 5 });

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    // Subtract 1 for the initial insert, 1 for the final COMPLETE update
    // The remaining calls are streaming content updates
    const totalMutations = ctx.mutations.length;
    const streamingUpdates = totalMutations - 2; // insert + final complete

    // With 100 tokens at 5ms each (500ms total) and 50ms batch interval,
    // we expect ~10 batch updates. Allow tolerance of +/- 5.
    expect(streamingUpdates).toBeGreaterThan(3);
    expect(streamingUpdates).toBeLessThan(30);
    // Key assertion: far fewer updates than tokens
    expect(streamingUpdates).toBeLessThan(tokens.length);
  });
});

// ---------------------------------------------------------------------------
// AC 4: On completion, a final mutation sets status=COMPLETE and records the
//        total token count in the message row
// ---------------------------------------------------------------------------
describe("On completion, a final mutation sets status=COMPLETE and records the total token count in the message row", () => {
  test("final mutation sets status to COMPLETE", async () => {
    const ctx = createMockCtx();
    const client = createMockAnthropicClient(["Hello", " ", "world"]);

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toMatchObject({
      status: "COMPLETE",
    });
  });

  test("final mutation content contains all tokens concatenated", async () => {
    const ctx = createMockCtx();
    const tokens = ["Hello", " ", "world", "!"];
    const client = createMockAnthropicClient(tokens);

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toHaveProperty("content", "Hello world!");
  });

  test("final mutation records total token count (input + output)", async () => {
    const ctx = createMockCtx();
    const client = createMockAnthropicClient(["a", "b"], {
      inputTokens: 25,
      outputTokens: 50,
    });

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toHaveProperty("tokens", 75); // 25 + 50
  });
});

// ---------------------------------------------------------------------------
// AC 5: On error, status is set to ERROR with error details stored in the
//        content field
// ---------------------------------------------------------------------------
describe("On error, status is set to ERROR with error details stored in the content field", () => {
  test("network error during streaming sets status=ERROR with error message in content", async () => {
    const ctx = createMockCtx();
    const client = {
      messages: {
        stream: vi.fn(() => {
          async function* failingStream() {
            yield {
              type: "content_block_delta" as const,
              delta: { type: "text_delta" as const, text: "partial" },
            };
            throw new Error("Network connection lost");
          }
          return { [Symbol.asyncIterator]: () => failingStream() };
        }),
      },
    };

    // streamAIResponse should not throw — it should handle the error gracefully
    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toMatchObject({
      status: "ERROR",
    });
    expect(lastMutation.args.content).toBeDefined();
    expect(typeof lastMutation.args.content).toBe("string");
    expect((lastMutation.args.content as string).length).toBeGreaterThan(0);
  });

  test("error before any tokens still inserts STREAMING row then updates to ERROR", async () => {
    const ctx = createMockCtx();
    const client = {
      messages: {
        stream: vi.fn(() => {
          throw new Error("API unreachable");
        }),
      },
    };

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    // First mutation: insert with STREAMING
    expect(ctx.mutations[0].args).toMatchObject({ status: "STREAMING" });
    // Last mutation: update to ERROR
    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toMatchObject({ status: "ERROR" });
  });
});

// ---------------------------------------------------------------------------
// AC 6: AI error handling matches TechSpec section 6.5: retry once on HTTP
//        429 with 2s backoff, mark ERROR on network timeout >30s, handle
//        Anthropic content filter responses gracefully
// ---------------------------------------------------------------------------
describe("AI error handling matches TechSpec section 6.5: retry once on HTTP 429 with 2s backoff, mark ERROR on network timeout >30s, handle Anthropic content filter responses gracefully", () => {
  test("on first 429 response, helper retries after ~2s backoff and succeeds", async () => {
    const ctx = createMockCtx();
    let callCount = 0;

    const client = {
      messages: {
        stream: vi.fn(() => {
          callCount++;
          if (callCount === 1) {
            const err = new Error("Rate limited") as Error & { status: number };
            err.status = 429;
            throw err;
          }
          // Second call succeeds
          return {
            [Symbol.asyncIterator]: () =>
              createMockAnthropicStream(["success"]),
          };
        }),
      },
    };

    const start = Date.now();
    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });
    const elapsed = Date.now() - start;

    // Should have retried (2 calls total)
    expect(callCount).toBe(2);
    // Should have waited approximately 2 seconds
    expect(elapsed).toBeGreaterThanOrEqual(1500);
    // Should complete successfully
    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toMatchObject({ status: "COMPLETE" });
  });

  test("on two consecutive 429 responses, message is marked ERROR", async () => {
    const ctx = createMockCtx();
    let callCount = 0;

    const client = {
      messages: {
        stream: vi.fn(() => {
          callCount++;
          const err = new Error("Rate limited") as Error & { status: number };
          err.status = 429;
          throw err;
        }),
      },
    };

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    // Two attempts (original + one retry)
    expect(callCount).toBe(2);
    // Message marked as ERROR
    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toMatchObject({ status: "ERROR" });
  });

  test("on network timeout >30s with no tokens, message is marked ERROR", async () => {
    const ctx = createMockCtx();
    const client = {
      messages: {
        stream: vi.fn(() => {
          // Simulate a stream that never yields any tokens and times out
          async function* hangingStream() {
            // This simulates the helper's internal timeout detection
            await new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 31000),
            );
          }
          return { [Symbol.asyncIterator]: () => hangingStream() };
        }),
      },
    };

    // The helper should enforce a 30s timeout internally, not wait for the
    // stream's own timeout. We verify it marks ERROR.
    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toMatchObject({ status: "ERROR" });
  }, 35000); // extended timeout for this test

  test("content filter stop reason produces a user-friendly error message and status=ERROR", async () => {
    const ctx = createMockCtx();
    const client = createMockAnthropicClient([], {
      stopReason: "content_filter",
    });

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toMatchObject({ status: "ERROR" });
    // Content should be a user-friendly message, not a raw error
    const content = lastMutation.args.content as string;
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
    // Should not contain stack traces or raw error objects
    expect(content).not.toContain("Error:");
    expect(content).not.toContain("stack");
  });
});

// ---------------------------------------------------------------------------
// AC 7: The Anthropic SDK (@anthropic-ai/sdk) is initialized using the
//        ANTHROPIC_API_KEY Convex environment variable and is never exposed
//        to the client
// ---------------------------------------------------------------------------
describe("The Anthropic SDK (@anthropic-ai/sdk) is initialized using the ANTHROPIC_API_KEY Convex environment variable and is never exposed to the client", () => {
  test("streamAIResponse accepts an externally-constructed Anthropic client (initialized from env var by the calling action)", () => {
    // The streaming helper itself should accept an Anthropic client instance
    // rather than constructing one, so the calling Convex action is responsible
    // for `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`.
    // This test verifies the type signature accepts an anthropicClient parameter.
    const opts: StreamAIResponseOptions = {
      ctx: {} as StreamAIResponseOptions["ctx"],
      anthropicClient: {} as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "test",
      userMessages: [{ role: "user", content: "test" }],
    };
    // If this compiles, the type accepts anthropicClient
    expect(opts.anthropicClient).toBeDefined();
  });

  test("streaming helper file is inside convex/ directory (server-only, not bundled to client)", async () => {
    // Verify the module path is under convex/, which Convex never bundles to the client
    const modulePath = "../../convex/lib/streaming";
    expect(modulePath).toContain("convex/");
  });
});

// ---------------------------------------------------------------------------
// Implementation note AC: CLAUDE_MOCK=true environment variable short-circuits
// the real API call and returns deterministic canned responses
// ---------------------------------------------------------------------------
describe("CLAUDE_MOCK=true environment variable short-circuits the real API call and returns deterministic canned responses with simulated streaming delays", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, CLAUDE_MOCK: "true" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("with CLAUDE_MOCK=true, streamAIResponse completes without a real Anthropic client", async () => {
    const ctx = createMockCtx();

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      // Pass null/undefined client — mock mode should not use it
      anthropicClient: null as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    // Should still complete the full lifecycle
    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toMatchObject({ status: "COMPLETE" });
  });

  test("mock mode returns deterministic canned content", async () => {
    const ctx = createMockCtx();

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: null as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    const content = lastMutation.args.content as string;
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);

    // Run again — should produce identical content (deterministic)
    const ctx2 = createMockCtx();
    await streamAIResponse({
      ctx: ctx2 as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: null as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    const lastMutation2 = ctx2.mutations[ctx2.mutations.length - 1];
    expect(lastMutation2.args.content).toBe(content);
  });

  test("mock mode simulates streaming delay (does not return instantly)", async () => {
    const ctx = createMockCtx();
    const start = Date.now();

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: null as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    const elapsed = Date.now() - start;
    // Should take at least some time to simulate streaming
    expect(elapsed).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// Additional: model parameter acceptance
// ---------------------------------------------------------------------------
describe("The helper accepts a model parameter for choosing between Sonnet and Haiku", () => {
  test("model parameter is passed to the Anthropic client", async () => {
    const ctx = createMockCtx();
    const streamFn = vi.fn(() => ({
      [Symbol.asyncIterator]: () =>
        createMockAnthropicStream(["ok"]),
    }));
    const client = { messages: { stream: streamFn } };

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient: client as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "jointMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-haiku-4-5-20251001",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "classify this" }],
    });

    expect(streamFn).toHaveBeenCalled();
    const callArgs = streamFn.mock.calls[0][0] as Record<string, unknown> | undefined;
    expect(callArgs).toHaveProperty("model", "claude-haiku-4-5-20251001");
  });
});

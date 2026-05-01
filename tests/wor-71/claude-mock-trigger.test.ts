import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  streamAIResponse,
  type StreamAIResponseOptions,
} from "../../convex/lib/streaming";

/**
 * WOR-71 AC: CLAUDE_MOCK=true env var triggers stub AI responder in Convex actions
 *
 * These tests verify the env-var gating mechanism: when CLAUDE_MOCK=true, the
 * streaming helper bypasses the real Anthropic API and uses a stub responder.
 */

function createMockCtx() {
  const mutations: Array<{ name: string; args: Record<string, unknown> }> = [];
  return {
    mutations,
    runMutation: vi.fn(async (_name: string, args: Record<string, unknown>) => {
      mutations.push({ name: _name, args });
      return "mock_message_id";
    }),
  };
}

describe("AC: CLAUDE_MOCK=true env var triggers stub AI responder in Convex actions", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  test("when CLAUDE_MOCK=true, the Anthropic client is never called", async () => {
    process.env = { ...originalEnv, CLAUDE_MOCK: "true" };

    const ctx = createMockCtx();
    const streamFn = vi.fn();
    const fakeClient = { messages: { stream: streamFn } };

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient:
        fakeClient as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    // The real Anthropic client's stream method must NOT have been called
    expect(streamFn).not.toHaveBeenCalled();
    // But the lifecycle should still complete
    const lastMutation = ctx.mutations[ctx.mutations.length - 1];
    expect(lastMutation.args).toMatchObject({ status: "COMPLETE" });
  });

  test("when CLAUDE_MOCK is unset, the Anthropic client IS called", async () => {
    process.env = { ...originalEnv };
    delete process.env.CLAUDE_MOCK;

    const ctx = createMockCtx();

    async function* tokenStream() {
      yield {
        type: "content_block_delta" as const,
        delta: { type: "text_delta" as const, text: "hello" },
      };
      yield {
        type: "message_delta" as const,
        delta: { stop_reason: "end_turn" },
        usage: { input_tokens: 5, output_tokens: 1 },
      };
    }

    const streamFn = vi.fn(() => ({
      [Symbol.asyncIterator]: () => tokenStream(),
    }));
    const fakeClient = { messages: { stream: streamFn } };

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient:
        fakeClient as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    expect(streamFn).toHaveBeenCalled();
  });

  test("when CLAUDE_MOCK=false (not 'true'), the real client is used", async () => {
    process.env = { ...originalEnv, CLAUDE_MOCK: "false" };

    const ctx = createMockCtx();

    async function* tokenStream() {
      yield {
        type: "content_block_delta" as const,
        delta: { type: "text_delta" as const, text: "real" },
      };
      yield {
        type: "message_delta" as const,
        delta: { stop_reason: "end_turn" },
        usage: { input_tokens: 5, output_tokens: 1 },
      };
    }

    const streamFn = vi.fn(() => ({
      [Symbol.asyncIterator]: () => tokenStream(),
    }));
    const fakeClient = { messages: { stream: streamFn } };

    await streamAIResponse({
      ctx: ctx as unknown as StreamAIResponseOptions["ctx"],
      anthropicClient:
        fakeClient as unknown as StreamAIResponseOptions["anthropicClient"],
      table: "privateMessages",
      messageFields: { caseId: "fake_case_id" as never },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: "You are a coach.",
      userMessages: [{ role: "user" as const, content: "Hi" }],
    });

    expect(streamFn).toHaveBeenCalled();
  });
});

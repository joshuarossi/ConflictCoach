/**
 * Tests for WOR-65 AC3: Haiku is called with compression prompt:
 * "Summarize this conversation segment in 500 tokens or fewer, preserving
 * facts, decisions, emotional tone, and unresolved threads."
 *
 * This is an integration test with a mocked Anthropic client. We verify:
 * - The correct model (claude-haiku-4-5-20251001) is used
 * - The compression prompt is passed correctly
 * - The response is used as the SUMMARY content
 */
import { describe, test, expect, vi } from "vitest";

import { compressMessages } from "../../convex/lib/compression";

import type { Message } from "../../convex/lib/prompts";

const EXPECTED_COMPRESSION_PROMPT =
  "Summarize this conversation segment in 500 tokens or fewer, preserving facts, decisions, emotional tone, and unresolved threads.";

const EXPECTED_MODEL = "claude-haiku-4-5-20251001";

const CANNED_SUMMARY = "Both parties discussed communication issues. Key facts: disagreement over decision-making process. Emotional tone: frustrated but willing.";

function createMockAnthropicClient() {
  const createFn = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: CANNED_SUMMARY }],
  });

  return {
    messages: { create: createFn },
    _createFn: createFn,
  };
}

const testMessages: Message[] = [
  { role: "user", content: "I feel frustrated about the situation." },
  { role: "assistant", content: "I hear you. Can you tell me more?" },
  { role: "user", content: "They keep ignoring my input on decisions." },
];

describe("Haiku is called with compression prompt", () => {
  test("compressMessages calls Haiku with the exact compression prompt from the spec", async () => {
    const mockClient = createMockAnthropicClient();

    await compressMessages(testMessages, mockClient as unknown as import("@anthropic-ai/sdk").default);

    const call = mockClient._createFn.mock.calls[0][0];
    // System prompt must contain the exact compression instruction
    expect(call.system).toContain(EXPECTED_COMPRESSION_PROMPT);
  });

  test("compressMessages uses claude-haiku-4-5-20251001 model", async () => {
    const mockClient = createMockAnthropicClient();

    await compressMessages(testMessages, mockClient as unknown as import("@anthropic-ai/sdk").default);

    const call = mockClient._createFn.mock.calls[0][0];
    expect(call.model).toBe(EXPECTED_MODEL);
  });

  test("compressMessages returns the Haiku response as the summary text", async () => {
    const mockClient = createMockAnthropicClient();

    const summary = await compressMessages(testMessages, mockClient as unknown as import("@anthropic-ai/sdk").default);

    expect(summary).toBe(CANNED_SUMMARY);
  });

  test("compressMessages is a one-shot non-streaming call", async () => {
    const mockClient = createMockAnthropicClient();

    await compressMessages(testMessages, mockClient as unknown as import("@anthropic-ai/sdk").default);

    // Should call messages.create (not messages.stream)
    expect(mockClient._createFn).toHaveBeenCalledTimes(1);
    const call = mockClient._createFn.mock.calls[0][0];
    // stream should not be set, or should be false
    expect(call.stream).toBeFalsy();
  });

  test("compressMessages passes the conversation content to Haiku", async () => {
    const mockClient = createMockAnthropicClient();

    await compressMessages(testMessages, mockClient as unknown as import("@anthropic-ai/sdk").default);

    const call = mockClient._createFn.mock.calls[0][0];
    // The messages content should include the conversation being compressed
    const allContent = JSON.stringify(call.messages);
    expect(allContent).toContain("I feel frustrated about the situation");
    expect(allContent).toContain("They keep ignoring my input on decisions");
  });
});

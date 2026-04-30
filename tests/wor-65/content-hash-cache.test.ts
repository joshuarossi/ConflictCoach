/**
 * Tests for WOR-65 AC5: Summary is cached by content hash for reuse
 *
 * Call compression twice with the same message set — Haiku should only be
 * called once (second call returns cached result). Call with different
 * messages — Haiku should be called again.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";

import {
  compressMessages,
  clearCompressionCache,
} from "../../convex/lib/compression";

import type { Message } from "../../convex/lib/prompts";

const CANNED_SUMMARY_A = "Summary A: discussed frustrations about communication.";
const CANNED_SUMMARY_B = "Summary B: discussed timeline disagreements.";

function createMockClient(response: string) {
  const createFn = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: response }],
  });
  return { messages: { create: createFn }, _createFn: createFn };
}

const messagesA: Message[] = [
  { role: "user", content: "I feel frustrated about the situation." },
  { role: "assistant", content: "Tell me more about that." },
];

const messagesB: Message[] = [
  { role: "user", content: "The timeline keeps slipping." },
  { role: "assistant", content: "What impact does that have?" },
];

describe("Summary is cached by content hash for reuse", () => {
  beforeEach(() => {
    // Clear the cache between tests to ensure isolation
    clearCompressionCache();
  });

  test("calling compressMessages twice with the same messages only calls Haiku once", async () => {
    const mockClient = createMockClient(CANNED_SUMMARY_A);

    const result1 = await compressMessages(messagesA, mockClient as any);
    const result2 = await compressMessages(messagesA, mockClient as any);

    // Haiku should only be called once — second call uses cache
    expect(mockClient._createFn).toHaveBeenCalledTimes(1);
    // Both results should be identical
    expect(result1).toBe(result2);
    expect(result1).toBe(CANNED_SUMMARY_A);
  });

  test("calling compressMessages with different messages calls Haiku again", async () => {
    const mockClientA = createMockClient(CANNED_SUMMARY_A);

    await compressMessages(messagesA, mockClientA as any);
    await compressMessages(messagesB, mockClientA as any);

    // Haiku should be called twice — different content hashes
    expect(mockClientA._createFn).toHaveBeenCalledTimes(2);
  });

  test("cache key is based on content hash (SHA-256 of concatenated message contents)", async () => {
    const mockClient = createMockClient(CANNED_SUMMARY_A);

    // Same content, same result
    const result1 = await compressMessages(messagesA, mockClient as any);

    // Create identical messages (new array, same content)
    const messagesACopy: Message[] = [
      { role: "user", content: "I feel frustrated about the situation." },
      { role: "assistant", content: "Tell me more about that." },
    ];
    const result2 = await compressMessages(messagesACopy, mockClient as any);

    expect(mockClient._createFn).toHaveBeenCalledTimes(1);
    expect(result1).toBe(result2);
  });
});

/**
 * Tests for WOR-65 AC2: When context exceeds budget, oldest 50% of messages
 * are selected for compression
 *
 * The compression module must export a selectMessagesForCompression function
 * that picks the oldest half of the message array for summarization.
 */
import { describe, test, expect } from "vitest";

import { selectMessagesForCompression } from "../../convex/lib/compression";

import type { Message } from "../../convex/lib/prompts";

// Helper to create numbered messages
function makeMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    content: `Message ${i + 1}`,
  }));
}

describe("When context exceeds budget, oldest 50% of messages are selected for compression", () => {
  test("given 10 messages, the 5 oldest are selected for compression", () => {
    const messages = makeMessages(10);
    const selected = selectMessagesForCompression(messages);
    expect(selected).toHaveLength(5);
    // Oldest messages are the first 5
    expect(selected).toEqual(messages.slice(0, 5));
  });

  test("odd number of messages — rounds down (7 messages selects 3)", () => {
    const messages = makeMessages(7);
    const selected = selectMessagesForCompression(messages);
    // floor(7/2) = 3
    expect(selected).toHaveLength(3);
    expect(selected).toEqual(messages.slice(0, 3));
  });

  test("1 message — no compression (returns empty array)", () => {
    const messages = makeMessages(1);
    const selected = selectMessagesForCompression(messages);
    expect(selected).toHaveLength(0);
  });

  test("0 messages — no compression (returns empty array)", () => {
    const selected = selectMessagesForCompression([]);
    expect(selected).toHaveLength(0);
  });

  test("2 messages — selects 1 for compression", () => {
    const messages = makeMessages(2);
    const selected = selectMessagesForCompression(messages);
    expect(selected).toHaveLength(1);
    expect(selected).toEqual(messages.slice(0, 1));
  });
});

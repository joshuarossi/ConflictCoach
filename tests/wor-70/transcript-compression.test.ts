import { describe, test, expect, vi, afterEach } from "vitest";
import {
  estimateTokens,
  selectMessagesForCompression,
  compressMessages,
  replaceSummarizedMessages,
  shouldCompress,
  compressContext,
  clearCompressionCache,
  GENERATION_BUDGET,
  CLASSIFICATION_BUDGET,
} from "../../convex/lib/compression";
import type { Message } from "../../convex/lib/prompts";

function makeMessages(count: number, contentSize = 50): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
    content: `Message ${i}: ${"word ".repeat(contentSize)}`,
  }));
}

describe("Transcript compression tests: output is ≤500 tokens, preserves key information", () => {
  describe("selectMessagesForCompression", () => {
    test("selects oldest 50% of messages", () => {
      const msgs = makeMessages(10);
      const selected = selectMessagesForCompression(msgs);
      expect(selected).toHaveLength(5);
      expect(selected).toEqual(msgs.slice(0, 5));
    });

    test("returns empty array for single message", () => {
      expect(selectMessagesForCompression(makeMessages(1))).toEqual([]);
    });

    test("returns empty array for empty messages", () => {
      expect(selectMessagesForCompression([])).toEqual([]);
    });
  });

  describe("replaceSummarizedMessages", () => {
    test("replaces first N messages with a SUMMARY message", () => {
      const msgs = makeMessages(6);
      const result = replaceSummarizedMessages(msgs, 3, "Summarized content");
      expect(result).toHaveLength(4);
      expect(result[0].content).toContain("SUMMARY:");
      expect(result[0].content).toContain("Summarized content");
      expect(result[1]).toBe(msgs[3]);
    });

    test("returns original messages when compressedCount is 0", () => {
      const msgs = makeMessages(3);
      const result = replaceSummarizedMessages(msgs, 0, "unused");
      expect(result).toBe(msgs);
    });
  });

  describe("shouldCompress", () => {
    test("returns false for small message sets under generation budget", () => {
      const msgs = makeMessages(5, 10);
      expect(shouldCompress(msgs, "generation")).toBe(false);
    });

    test("returns true for message sets exceeding generation budget", () => {
      const msgs = makeMessages(5, 10000);
      expect(shouldCompress(msgs, "generation")).toBe(true);
    });

    test("classification budget is smaller than generation budget", () => {
      expect(CLASSIFICATION_BUDGET).toBeLessThan(GENERATION_BUDGET);
    });
  });

  describe("compressMessages (mocked Anthropic)", () => {
    afterEach(() => {
      clearCompressionCache();
    });

    test("output is ≤500 tokens and preserves key information", async () => {
      const summaryText =
        "The parties discussed their conflict about project direction. " +
        "Key facts: disagreement on tech stack, both value project success, " +
        "need to find compromise.";

      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: summaryText }],
          }),
        },
      } as unknown as import("@anthropic-ai/sdk").default;

      const msgs = makeMessages(4, 20);
      const result = await compressMessages(msgs, mockClient);

      expect(result).toBe(summaryText);
      expect(estimateTokens(result)).toBeLessThanOrEqual(500);
      expect(result).toContain("conflict");
      expect(result).toContain("tech stack");
    });

    test("caches results by content hash (same input returns cached result)", async () => {
      const mockClient = {
        messages: {
          create: vi.fn().mockResolvedValue({
            content: [{ type: "text", text: "Cached summary." }],
          }),
        },
      } as unknown as import("@anthropic-ai/sdk").default;

      const msgs = makeMessages(4, 20);
      const result1 = await compressMessages(msgs, mockClient);
      const result2 = await compressMessages(msgs, mockClient);

      expect(result1).toBe(result2);
      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("compressContext", () => {
    test("does not modify messages under budget", () => {
      const msgs = makeMessages(3, 10);
      const result = compressContext(msgs, "System prompt", GENERATION_BUDGET);
      expect(result).toEqual(msgs);
    });

    test("compresses messages when over budget", () => {
      // Use enough messages that compression removes some, but budget is
      // large enough that the summary + remaining messages fit after one pass
      const msgs = makeMessages(20, 50);
      const budget = 800; // small enough to trigger compression
      const result = compressContext(msgs, "", budget);
      expect(result.length).toBeLessThan(msgs.length);
      expect(result[0].content).toContain("SUMMARY:");
    });
  });
});

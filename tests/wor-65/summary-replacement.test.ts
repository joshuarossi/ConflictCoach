/**
 * Tests for WOR-65 AC4: Compressed messages are replaced with a single
 * SUMMARY: message in the context
 *
 * Given messages [m1, m2, m3, m4, m5] where m1-m2 are compressed, the output
 * should be [SUMMARY_msg, m3, m4, m5] where SUMMARY_msg has a distinctive
 * role/prefix.
 */
import { describe, test, expect } from "vitest";

import { replaceSummarizedMessages } from "../../convex/lib/compression";

import type { Message } from "../../convex/lib/prompts";

const messages: Message[] = [
  { role: "user", content: "Message 1" },
  { role: "assistant", content: "Message 2" },
  { role: "user", content: "Message 3" },
  { role: "assistant", content: "Message 4" },
  { role: "user", content: "Message 5" },
];

const summaryText =
  "Summary of the first two messages discussing the initial situation.";

describe("Compressed messages are replaced with a single SUMMARY: message in the context", () => {
  test("compressed messages are removed and replaced by a single summary message", () => {
    // Compress first 2 messages (indices 0-1)
    const compressedIndices = 2; // number of messages compressed from the start
    const result = replaceSummarizedMessages(
      messages,
      compressedIndices,
      summaryText,
    );

    // Total messages: 1 summary + 3 remaining = 4
    expect(result).toHaveLength(4);
  });

  test("summary message is the first message in the result", () => {
    const result = replaceSummarizedMessages(messages, 2, summaryText);

    expect(result[0].content).toContain(summaryText);
  });

  test("summary message has a distinctive SUMMARY: prefix", () => {
    const result = replaceSummarizedMessages(messages, 2, summaryText);

    // The summary message content should start with or contain "SUMMARY:"
    expect(result[0].content).toMatch(/SUMMARY:/i);
  });

  test("remaining messages are preserved in order after the summary", () => {
    const result = replaceSummarizedMessages(messages, 2, summaryText);

    // Messages after compression (m3, m4, m5) should follow the summary
    expect(result[1].content).toBe("Message 3");
    expect(result[2].content).toBe("Message 4");
    expect(result[3].content).toBe("Message 5");
  });

  test("summary message has a valid role (user or assistant)", () => {
    const result = replaceSummarizedMessages(messages, 2, summaryText);

    expect(["user", "assistant"]).toContain(result[0].role);
  });

  test("compressing 0 messages returns the original array unchanged", () => {
    const result = replaceSummarizedMessages(messages, 0, summaryText);

    expect(result).toEqual(messages);
  });
});

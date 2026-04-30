/**
 * Tests for WOR-65 AC6: Budget thresholds: 60k tokens for user-facing
 * generation, 10k for classification
 *
 * Compression should trigger at 60k tokens for generation context
 * (PRIVATE_COACH, COACH, DRAFT_COACH, SYNTHESIS) and 10k for classification
 * context. No compression should occur when under budget.
 */
import { describe, test, expect } from "vitest";

import {
  GENERATION_BUDGET,
  CLASSIFICATION_BUDGET,
  shouldCompress,
} from "../../convex/lib/compression";

import type { Message } from "../../convex/lib/prompts";

// Helper to create a message with roughly N tokens
function makeMessageWithTokens(approxTokens: number): Message {
  // Using word-based estimation (word * 1.3 ≈ tokens), generate enough words
  const wordCount = Math.ceil(approxTokens / 1.3);
  const content = Array.from({ length: wordCount }, (_, i) => `word${i}`).join(" ");
  return { role: "user", content };
}

describe("Budget thresholds: 60k tokens for user-facing generation, 10k for classification", () => {
  test("GENERATION_BUDGET is 60000 tokens", () => {
    expect(GENERATION_BUDGET).toBe(60_000);
  });

  test("CLASSIFICATION_BUDGET is 10000 tokens", () => {
    expect(CLASSIFICATION_BUDGET).toBe(10_000);
  });

  test("compression triggers when messages exceed the generation budget (60k)", () => {
    // Create messages totaling > 60k tokens
    const messages: Message[] = [
      makeMessageWithTokens(35_000),
      makeMessageWithTokens(30_000),
    ];

    const result = shouldCompress(messages, "generation");
    expect(result).toBe(true);
  });

  test("no compression when messages are under the generation budget (60k)", () => {
    const messages: Message[] = [
      makeMessageWithTokens(20_000),
      makeMessageWithTokens(20_000),
    ];

    const result = shouldCompress(messages, "generation");
    expect(result).toBe(false);
  });

  test("compression triggers when messages exceed the classification budget (10k)", () => {
    const messages: Message[] = [
      makeMessageWithTokens(6_000),
      makeMessageWithTokens(6_000),
    ];

    const result = shouldCompress(messages, "classification");
    expect(result).toBe(true);
  });

  test("no compression when messages are under the classification budget (10k)", () => {
    const messages: Message[] = [
      makeMessageWithTokens(3_000),
      makeMessageWithTokens(3_000),
    ];

    const result = shouldCompress(messages, "classification");
    expect(result).toBe(false);
  });

  test("shouldCompress uses estimateTokens to sum message token counts", () => {
    // A single small message should be well under both budgets
    const messages: Message[] = [
      { role: "user", content: "Hello, how are you?" },
    ];

    expect(shouldCompress(messages, "generation")).toBe(false);
    expect(shouldCompress(messages, "classification")).toBe(false);
  });
});

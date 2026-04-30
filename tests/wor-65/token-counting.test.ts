/**
 * Tests for WOR-65 AC1: Token counting utility estimates message token counts
 *
 * The compression module must export an estimateTokens function that returns
 * reasonable approximate token counts using a simple heuristic (word count * 1.3
 * or character count / 4 per TechSpec §6.4).
 */
import { describe, test, expect } from "vitest";

// This import will fail until convex/lib/compression.ts is implemented.
import { estimateTokens } from "../../convex/lib/compression";

describe("Token counting utility estimates message token counts", () => {
  test("empty string returns 0 tokens", () => {
    expect(estimateTokens("")).toBe(0);
  });

  test("single word returns approximately 1 token", () => {
    const count = estimateTokens("hello");
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(2);
  });

  test("100-word paragraph returns roughly 100-130 tokens", () => {
    const words = Array.from({ length: 100 }, (_, i) => `word${i}`);
    const paragraph = words.join(" ");
    const count = estimateTokens(paragraph);
    expect(count).toBeGreaterThanOrEqual(100);
    expect(count).toBeLessThanOrEqual(150);
  });

  test("estimates scale linearly with input length", () => {
    const short = "The quick brown fox jumps over the lazy dog";
    const long = Array(10).fill(short).join(" ");
    const shortCount = estimateTokens(short);
    const longCount = estimateTokens(long);
    // 10x the text should produce roughly 10x the tokens (within 20% tolerance)
    expect(longCount).toBeGreaterThanOrEqual(shortCount * 8);
    expect(longCount).toBeLessThanOrEqual(shortCount * 12);
  });

  test("returns a positive integer for non-empty input", () => {
    const count = estimateTokens("Some text to estimate.");
    expect(count).toBeGreaterThan(0);
    expect(Number.isInteger(count)).toBe(true);
  });
});

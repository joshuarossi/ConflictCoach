import { describe, test, expect } from "vitest";
import { estimateTokens } from "../../convex/lib/compression";

describe("Token counting tests: reasonable estimates for various message lengths", () => {
  test("empty string returns 0", () => {
    expect(estimateTokens("")).toBe(0);
  });

  test("single word returns a small positive number", () => {
    const result = estimateTokens("hello");
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(5);
  });

  test("a short sentence produces reasonable estimate", () => {
    // "The quick brown fox" = 4 words × 1.3 ≈ 5.2 → 6
    const result = estimateTokens("The quick brown fox");
    expect(result).toBeGreaterThanOrEqual(4);
    expect(result).toBeLessThanOrEqual(10);
  });

  test("a paragraph produces estimate proportional to word count", () => {
    const paragraph =
      "This is a longer paragraph that contains multiple sentences. " +
      "It should produce a token estimate that is roughly proportional to " +
      "the number of words in the text. The formula multiplies word count by 1.3.";
    const wordCount = paragraph.split(/\s+/).filter(Boolean).length;
    const result = estimateTokens(paragraph);

    // Should be between wordCount and wordCount × 2 (reasonable range)
    expect(result).toBeGreaterThanOrEqual(wordCount);
    expect(result).toBeLessThanOrEqual(wordCount * 2);
  });

  test("a very long input scales linearly with word count", () => {
    const sentence = "The quick brown fox jumps over the lazy dog. ";
    const longInput = sentence.repeat(100);
    const wordCount = longInput.split(/\s+/).filter(Boolean).length;
    const result = estimateTokens(longInput);

    // word count × 1.3, ceiling
    expect(result).toBe(Math.ceil(wordCount * 1.3));
  });

  test("whitespace-only string returns 0", () => {
    expect(estimateTokens("   \n\t  ")).toBe(0);
  });

  test("estimate follows word-count × 1.3 formula", () => {
    const text = "one two three four five six seven eight nine ten";
    // 10 words × 1.3 = 13
    expect(estimateTokens(text)).toBe(13);
  });
});

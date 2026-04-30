/**
 * WOR-40: Privacy response filter — Tokenization tests
 *
 * Covers AC 2: Tokenization splits messages into words/tokens for
 * substring matching.
 */
import { describe, test, expect } from "vitest";
import { tokenize } from "../../convex/lib/privacyFilter";

describe("AC 2: Tokenization splits messages into words/tokens for substring matching", () => {
  test('splits "Hello, world! How are you?" into ["hello", "world", "how", "are", "you"]', () => {
    const result = tokenize("Hello, world! How are you?");
    expect(result).toEqual(["hello", "world", "how", "are", "you"]);
  });

  test("lowercases all tokens", () => {
    const result = tokenize("The QUICK Brown FOX");
    expect(result).toEqual(["the", "quick", "brown", "fox"]);
  });

  test("strips leading and trailing punctuation from tokens", () => {
    const result = tokenize('"hello," she said. "goodbye!"');
    expect(result).toEqual(["hello", "she", "said", "goodbye"]);
  });

  test("collapses multiple whitespace characters", () => {
    const result = tokenize("word1    word2\t\tword3\nword4");
    expect(result).toEqual(["word1", "word2", "word3", "word4"]);
  });

  test("returns empty array for empty string", () => {
    const result = tokenize("");
    expect(result).toEqual([]);
  });

  test("returns empty array for punctuation-only input", () => {
    const result = tokenize("... !!! ???");
    expect(result).toEqual([]);
  });

  test("handles mixed punctuation boundaries", () => {
    const result = tokenize("well—actually, it's (complicated)");
    // Hyphens/dashes are punctuation boundaries; contractions may split
    expect(result).toContain("well");
    expect(result).toContain("actually");
    expect(result).toContain("complicated");
  });
});

import { describe, test, expect } from "vitest";
import {
  tokenize,
  checkPrivacyViolation,
} from "../../convex/lib/privacyFilter";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// A sentence with exactly 10 tokens for easy verbatim matching
const PRIVATE_MSG_10_TOKENS =
  "my boss always undermines me in front of the team";

// 8-token substring from the message above (tokens 0..7)
const VERBATIM_8 = "my boss always undermines me in front of";

// 7-token substring (tokens 0..6) — below threshold
const VERBATIM_7 = "my boss always undermines me in front";

// A paraphrase of the same content — no 8-token overlap
const PARAPHRASE =
  "The employee feels their manager does not support them during group meetings and frequently criticises them publicly.";

describe("Privacy response filter tests: true positives, true negatives, edge cases", () => {
  // -------------------------------------------------------------------------
  // Tokenization
  // -------------------------------------------------------------------------

  describe("tokenize", () => {
    test("lowercases and strips punctuation", () => {
      expect(tokenize("Hello, World!")).toEqual(["hello", "world"]);
    });

    test("handles em-dashes, hyphens, and slashes as separators", () => {
      const tokens = tokenize("self-care — important/vital");
      expect(tokens).toEqual(["self", "care", "important", "vital"]);
    });

    test("returns empty array for empty string", () => {
      expect(tokenize("")).toEqual([]);
    });

    test("returns empty array for punctuation-only input", () => {
      expect(tokenize("!!! --- ???")).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // True positives: verbatim matches >= 8 tokens
  // -------------------------------------------------------------------------

  describe("true positives (verbatim matches >= 8 tokens)", () => {
    test("10-token verbatim substring is detected", () => {
      const aiOutput = `I understand how you feel. ${PRIVATE_MSG_10_TOKENS} and that must be frustrating.`;
      const result = checkPrivacyViolation(aiOutput, [PRIVATE_MSG_10_TOKENS]);
      expect(result.isViolation).toBe(true);
      expect(result.matchDetails).not.toBeNull();
      expect(result.matchDetails!.length).toBeGreaterThan(0);
    });

    test("exact 8-token verbatim substring is detected", () => {
      const aiOutput = `Based on what was shared: ${VERBATIM_8} — this is concerning.`;
      const result = checkPrivacyViolation(aiOutput, [PRIVATE_MSG_10_TOKENS]);
      expect(result.isViolation).toBe(true);
    });

    test("match is case-insensitive", () => {
      const aiOutput = PRIVATE_MSG_10_TOKENS.toUpperCase();
      const result = checkPrivacyViolation(aiOutput, [PRIVATE_MSG_10_TOKENS]);
      expect(result.isViolation).toBe(true);
    });

    test("punctuation differences do not prevent detection", () => {
      // Same words but with added punctuation
      const aiOutput = "My boss, always undermines me... in front of the team!";
      const result = checkPrivacyViolation(aiOutput, [PRIVATE_MSG_10_TOKENS]);
      expect(result.isViolation).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // True negatives: paraphrased content passes
  // -------------------------------------------------------------------------

  describe("true negatives (paraphrased content passes)", () => {
    test("paraphrased content does not trigger violation", () => {
      const result = checkPrivacyViolation(PARAPHRASE, [PRIVATE_MSG_10_TOKENS]);
      expect(result.isViolation).toBe(false);
      expect(result.matchDetails).toBeNull();
    });

    test("completely unrelated content does not trigger violation", () => {
      const result = checkPrivacyViolation(
        "The weather today is sunny with a chance of rain in the afternoon.",
        [PRIVATE_MSG_10_TOKENS],
      );
      expect(result.isViolation).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Boundary cases: 7 tokens pass, 8 tokens fail
  // -------------------------------------------------------------------------

  describe("boundary cases", () => {
    test("exactly 7 matching tokens does NOT trigger violation", () => {
      const aiOutput = `I noticed that ${VERBATIM_7} — something worth discussing.`;
      const result = checkPrivacyViolation(aiOutput, [PRIVATE_MSG_10_TOKENS]);
      expect(result.isViolation).toBe(false);
    });

    test("exactly 8 matching tokens DOES trigger violation", () => {
      const aiOutput = `I noticed that ${VERBATIM_8} — something worth discussing.`;
      const result = checkPrivacyViolation(aiOutput, [PRIVATE_MSG_10_TOKENS]);
      expect(result.isViolation).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases: empty input, short messages
  // -------------------------------------------------------------------------

  describe("edge cases", () => {
    test("empty messages array returns no violation", () => {
      const result = checkPrivacyViolation("any output text here", []);
      expect(result.isViolation).toBe(false);
      expect(result.matchDetails).toBeNull();
    });

    test("empty AI output returns no violation", () => {
      const result = checkPrivacyViolation("", [PRIVATE_MSG_10_TOKENS]);
      expect(result.isViolation).toBe(false);
    });

    test("messages shorter than 8 tokens are skipped (cannot form a match)", () => {
      const shortMsg = "I feel bad";
      // Even if the AI output contains this exact phrase, the message is too
      // short to form an 8-token window
      const result = checkPrivacyViolation("I feel bad about the situation", [
        shortMsg,
      ]);
      expect(result.isViolation).toBe(false);
    });

    test("multiple messages — violation in second message detected", () => {
      const shortMsg = "hello world";
      const result = checkPrivacyViolation(
        `Something about ${PRIVATE_MSG_10_TOKENS} here.`,
        [shortMsg, PRIVATE_MSG_10_TOKENS],
      );
      expect(result.isViolation).toBe(true);
      expect(result.matchDetails![0].messageIndex).toBe(1);
    });
  });
});

/**
 * WOR-40: Privacy response filter — checkPrivacyViolation tests
 *
 * Covers AC 1 (interface), AC 3 (8-token threshold), AC 4 (reusable),
 * and AC 7 (edge cases).
 */
import { describe, test, expect } from "vitest";
import {
  checkPrivacyViolation,
  tokenize,
} from "../../convex/lib/privacyFilter";

// ---------------------------------------------------------------------------
// AC 1: checkPrivacyViolation(aiOutput, otherPartyMessages) returns
//        { isViolation, matchDetails }
// ---------------------------------------------------------------------------
describe("AC 1: checkPrivacyViolation returns { isViolation, matchDetails }", () => {
  test("returns { isViolation: false } for clean AI output", () => {
    const aiOutput =
      "Both parties seem to have areas of common ground worth exploring.";
    const otherPartyMessages = [
      "I feel like my manager never listens to me and always dismisses my ideas in meetings.",
    ];

    const result = checkPrivacyViolation(aiOutput, otherPartyMessages);

    expect(result).toHaveProperty("isViolation", false);
    expect(result).toHaveProperty("matchDetails");
  });

  test("returns { isViolation: true, matchDetails } when AI output contains 8+ consecutive tokens from a private message", () => {
    const privateMessage =
      "I feel like my manager never listens to me and always dismisses my ideas in meetings during our weekly standup calls";
    const aiOutput =
      "The other party mentioned that they feel like my manager never listens to me and always dismisses which is concerning.";
    const otherPartyMessages = [privateMessage];

    const result = checkPrivacyViolation(aiOutput, otherPartyMessages);

    expect(result.isViolation).toBe(true);
    expect(result.matchDetails).toBeDefined();
    expect(result.matchDetails!.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC 3: Match threshold — >= 8 consecutive tokens triggers violation
// ---------------------------------------------------------------------------
describe("AC 3: Match threshold >= 8 consecutive tokens", () => {
  test("7 consecutive matching tokens does NOT trigger a violation", () => {
    // Exactly 7 overlapping tokens: "one two three four five six seven"
    const privateMessage = "one two three four five six seven extra words here";
    const aiOutput =
      "The response includes one two three four five six seven which is fine.";

    const result = checkPrivacyViolation(aiOutput, [privateMessage]);

    expect(result.isViolation).toBe(false);
  });

  test("8 consecutive matching tokens DOES trigger a violation", () => {
    // Exactly 8 overlapping tokens: "one two three four five six seven eight"
    const privateMessage =
      "one two three four five six seven eight extra words here";
    const aiOutput =
      "The response includes one two three four five six seven eight which is problematic.";

    const result = checkPrivacyViolation(aiOutput, [privateMessage]);

    expect(result.isViolation).toBe(true);
    expect(result.matchDetails!.length).toBeGreaterThan(0);
  });

  test("9 consecutive matching tokens also triggers a violation", () => {
    const privateMessage =
      "alpha beta gamma delta epsilon zeta eta theta iota words";
    const aiOutput =
      "Here we see alpha beta gamma delta epsilon zeta eta theta iota appearing.";

    const result = checkPrivacyViolation(aiOutput, [privateMessage]);

    expect(result.isViolation).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC 4: Function is reusable by both Synthesis and Coach actions
// ---------------------------------------------------------------------------
describe("AC 4: Function is reusable by both Synthesis and Coach actions", () => {
  test("works with Synthesis-shaped input (single party messages vs AI synthesis)", () => {
    const partyAMessages = [
      "I feel angry that my partner spends all weekend watching football ignoring our children completely every single weekend",
    ];
    const synthesisForPartyB =
      "There are concerns about weekend time allocation and family engagement.";

    const result = checkPrivacyViolation(synthesisForPartyB, partyAMessages);

    expect(result).toHaveProperty("isViolation");
    expect(result).toHaveProperty("matchDetails");
    expect(result.isViolation).toBe(false);
  });

  test("works with Coach-shaped input (both parties messages vs Coach output)", () => {
    const allPrivateMessages = [
      "My coworker always takes credit for my work in front of the boss",
      "I feel like my teammate doesn't pull their weight on projects",
    ];
    const coachOutput =
      "It seems there are concerns about recognition and contribution balance.";

    const result = checkPrivacyViolation(coachOutput, allPrivateMessages);

    expect(result).toHaveProperty("isViolation");
    expect(result).toHaveProperty("matchDetails");
    expect(result.isViolation).toBe(false);
  });

  test("detects violation identically regardless of input shape", () => {
    const privateMessages = [
      "my partner always takes credit for my work in front of the boss every single time",
    ];
    // AI output quotes verbatim
    const aiOutput =
      "They said my partner always takes credit for my work in front of the boss every single time.";

    const result = checkPrivacyViolation(aiOutput, privateMessages);

    expect(result.isViolation).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC 7: Edge cases
// ---------------------------------------------------------------------------
describe("AC 7: Edge cases handled", () => {
  test("empty otherPartyMessages array returns isViolation: false", () => {
    const result = checkPrivacyViolation("Some AI output text here.", []);
    expect(result.isViolation).toBe(false);
  });

  test("message with fewer than 8 tokens is skipped (no violation possible)", () => {
    const shortMessage = "I feel angry today";
    const aiOutput = "They said I feel angry today which is understandable.";

    const result = checkPrivacyViolation(aiOutput, [shortMessage]);

    // Short message should be skipped entirely — cannot form 8-token match
    expect(result.isViolation).toBe(false);
  });

  test("AI output with no words returns isViolation: false", () => {
    const result = checkPrivacyViolation("", [
      "some private message content here that is long enough",
    ]);
    expect(result.isViolation).toBe(false);
  });

  test("punctuation-only differences between AI output and private message still trigger match", () => {
    const privateMessage =
      "I feel, like my manager; never listens! to me: and always dismisses my ideas";
    // Same words without punctuation
    const aiOutput =
      "They said I feel like my manager never listens to me and always dismisses my ideas.";

    const result = checkPrivacyViolation(aiOutput, [privateMessage]);

    expect(result.isViolation).toBe(true);
  });

  test("case differences between AI output and private message still trigger match", () => {
    const privateMessage =
      "I FEEL like MY manager NEVER listens TO me AND always DISMISSES my ideas";
    const aiOutput =
      "i feel like my manager never listens to me and always dismisses my ideas";

    const result = checkPrivacyViolation(aiOutput, [privateMessage]);

    expect(result.isViolation).toBe(true);
  });

  test("multiple private messages — violation in any one triggers", () => {
    const messages = [
      "short msg",
      "another one",
      "this is a longer message with enough tokens to be considered alpha beta gamma delta epsilon zeta eta theta iota",
    ];
    const aiOutput =
      "We see alpha beta gamma delta epsilon zeta eta theta iota appearing in context.";

    const result = checkPrivacyViolation(aiOutput, messages);

    expect(result.isViolation).toBe(true);
  });
});

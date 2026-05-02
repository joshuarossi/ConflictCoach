/**
 * WOR-75 AC3: Coach AI response in joint chat does not contain any 8-token
 * substring from either party's private messages.
 *
 * Tests the privacy response filter (TechSpec §6.3.2) by verifying that:
 * - Known private message content is detected when embedded in a coach response.
 * - Clean coach responses (synthesized, not quoting) pass the filter.
 * - The 8-consecutive-token threshold is respected exactly.
 */
import { describe, test, expect } from "vitest";
import {
  checkPrivacyViolation,
  tokenize,
} from "../../convex/lib/privacyFilter";

/** Distinctive private messages from each party, used as the "known content" */
const PARTY_A_PRIVATE_MESSAGES = [
  "My manager Sarah constantly undermines my decisions in front of the entire team during our weekly standup meetings",
  "I have documented at least fifteen instances where Sarah publicly contradicted my technical recommendations without any prior discussion",
];

const PARTY_B_PRIVATE_MESSAGES = [
  "I feel completely ignored whenever I raise concerns about the aggressive timeline for the product redesign project",
  "The leadership team has repeatedly dismissed my warnings about burnout on the engineering team during quarterly planning sessions",
];

const ALL_PRIVATE_MESSAGES = [
  ...PARTY_A_PRIVATE_MESSAGES,
  ...PARTY_B_PRIVATE_MESSAGES,
];

describe("AC3: Coach response does not leak private content via 8-token substring", () => {
  test("coach response quoting 8+ consecutive tokens from party A is flagged as violation", () => {
    // Embed a verbatim 8-token substring from party A's first message
    const verbatimChunk =
      "Sarah constantly undermines my decisions in front of the entire";
    const coachResponse = `Both parties have expressed concerns. ${verbatimChunk} team is something that needs addressing.`;

    const result = checkPrivacyViolation(coachResponse, ALL_PRIVATE_MESSAGES);

    expect(result.isViolation).toBe(true);
    expect(result.matchDetails).not.toBeNull();
    expect(result.matchDetails!.length).toBeGreaterThan(0);
  });

  test("coach response quoting 8+ consecutive tokens from party B is flagged as violation", () => {
    const verbatimChunk =
      "raise concerns about the aggressive timeline for the product redesign project";
    const coachResponse = `It seems like one party wants to ${verbatimChunk} and the other disagrees.`;

    const result = checkPrivacyViolation(coachResponse, ALL_PRIVATE_MESSAGES);

    expect(result.isViolation).toBe(true);
    expect(result.matchDetails).not.toBeNull();
  });

  test("clean synthesized coach response passes the filter", () => {
    const coachResponse =
      "Both parties have expressed concerns about communication and project management. " +
      "There appears to be shared ground around wanting clearer processes for decision-making. " +
      "I encourage you both to focus on what a healthy working dynamic looks like going forward.";

    const result = checkPrivacyViolation(coachResponse, ALL_PRIVATE_MESSAGES);

    expect(result.isViolation).toBe(false);
    expect(result.matchDetails).toBeNull();
  });

  test("7 consecutive matching tokens do NOT trigger a violation (threshold is 8)", () => {
    // Extract exactly 7 consecutive tokens from party A's message
    const tokens = tokenize(PARTY_A_PRIVATE_MESSAGES[0]);
    const sevenTokens = tokens.slice(0, 7).join(" ");
    const coachResponse = `The situation involves ${sevenTokens} which is understandable.`;

    const result = checkPrivacyViolation(coachResponse, ALL_PRIVATE_MESSAGES);

    expect(result.isViolation).toBe(false);
  });

  test("exactly 8 consecutive matching tokens DO trigger a violation", () => {
    const tokens = tokenize(PARTY_A_PRIVATE_MESSAGES[0]);
    const eightTokens = tokens.slice(0, 8).join(" ");
    const coachResponse = `The discussion centers on ${eightTokens} which needs resolution.`;

    const result = checkPrivacyViolation(coachResponse, ALL_PRIVATE_MESSAGES);

    expect(result.isViolation).toBe(true);
  });

  test("privacy filter checks against BOTH parties' messages, not just one", () => {
    // Embed content from party B in a response supposedly for party A
    const verbatimFromB =
      "dismissed my warnings about burnout on the engineering team during quarterly planning";
    const coachResponse = `We should discuss how the team has ${verbatimFromB} sessions.`;

    const result = checkPrivacyViolation(coachResponse, ALL_PRIVATE_MESSAGES);

    expect(result.isViolation).toBe(true);
    // The match should reference the message from party B (index 3)
    expect(result.matchDetails!.some((d) => d.messageIndex >= 2)).toBe(true);
  });

  test("empty private messages produce no violation", () => {
    const coachResponse = "Let's discuss the situation openly.";
    const result = checkPrivacyViolation(coachResponse, []);

    expect(result.isViolation).toBe(false);
  });

  test("short private messages (< 8 tokens) are skipped safely", () => {
    const shortMessages = ["Hello there", "I agree"];
    const coachResponse = "Hello there, I agree with the approach. Let's proceed.";

    const result = checkPrivacyViolation(coachResponse, shortMessages);

    expect(result.isViolation).toBe(false);
  });
});

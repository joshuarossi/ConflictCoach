/**
 * WOR-48: Coach facilitator AI — Privacy filter integration tests
 *
 * AC 5: Privacy response filter runs on coach output against both parties'
 *        private messages
 */
import { describe, test, expect, vi } from "vitest";
import {
  checkPrivacyViolation,
  filterOrRetry,
  FALLBACK_TEXT,
} from "../../convex/lib/privacyFilter";

// ---------------------------------------------------------------------------
// AC 5: Privacy filter applied to coach output
// ---------------------------------------------------------------------------
describe("AC 5: Privacy response filter runs on coach output", () => {
  test("detects privacy violation when coach output contains 8+ consecutive tokens from private message", () => {
    const privateMessages = [
      "my manager told me in confidence that they are planning to restructure the entire department next quarter",
    ];

    // Coach output that quotes the private message verbatim
    const coachOutput =
      "The other party mentioned that they are planning to restructure the entire department next quarter which is concerning.";

    const result = checkPrivacyViolation(coachOutput, privateMessages);
    expect(result.isViolation).toBe(true);
    expect(result.matchDetails).not.toBeNull();
    expect(result.matchDetails!.length).toBeGreaterThan(0);
  });

  test("passes when coach output synthesizes without quoting private content", () => {
    const privateMessages = [
      "my manager told me in confidence that they are planning to restructure the entire department next quarter",
    ];

    // Coach output that synthesizes without verbatim quoting
    const coachOutput =
      "There seem to be concerns about organizational changes that may be affecting both parties. Let's discuss how to address these worries constructively.";

    const result = checkPrivacyViolation(coachOutput, privateMessages);
    expect(result.isViolation).toBe(false);
  });

  test("filterOrRetry regenerates coach response when privacy violation detected", async () => {
    const violatingOutput =
      "They said my manager told me in confidence that they are planning to restructure the entire department next quarter.";
    const cleanOutput =
      "There are concerns about workplace changes that both parties should discuss openly.";

    const generateFn = vi
      .fn()
      .mockResolvedValueOnce(violatingOutput)
      .mockResolvedValueOnce(cleanOutput);

    const otherPartyMessages = [
      "my manager told me in confidence that they are planning to restructure the entire department next quarter",
    ];
    const mockCtx = { db: { insert: vi.fn() } };

    const result = await filterOrRetry(
      generateFn,
      otherPartyMessages,
      2,
      mockCtx as any,
    );

    expect(result).toBe(cleanOutput);
    expect(generateFn).toHaveBeenCalledTimes(2);
  });

  test("filterOrRetry checks against BOTH parties' private messages", async () => {
    // Party A's private content
    const partyAPrivate =
      "I secretly think the whole project is doomed and I want to leave the company before it all falls apart";
    // Party B's private content
    const partyBPrivate =
      "my real concern is that my colleague takes credit for all my work and never acknowledges my contributions";

    const allPrivateMessages = [partyAPrivate, partyBPrivate];

    // Coach output quoting Party B
    const violatingOutput =
      "One party feels that my colleague takes credit for all my work and never acknowledges my contributions which is understandable.";
    const cleanOutput =
      "Both parties have concerns about recognition and collaboration that we should address.";

    const generateFn = vi
      .fn()
      .mockResolvedValueOnce(violatingOutput)
      .mockResolvedValueOnce(cleanOutput);
    const mockCtx = { db: { insert: vi.fn() } };

    const result = await filterOrRetry(
      generateFn,
      allPrivateMessages,
      2,
      mockCtx as any,
    );

    expect(result).toBe(cleanOutput);
    // First attempt violated (quoting Party B), second attempt was clean
    expect(generateFn).toHaveBeenCalledTimes(2);
  });

  test("returns fallback text when all regeneration attempts fail privacy check", async () => {
    const violatingOutput =
      "They said my manager told me in confidence that they are planning to restructure the entire department next quarter.";

    const generateFn = vi.fn().mockResolvedValue(violatingOutput);
    const otherPartyMessages = [
      "my manager told me in confidence that they are planning to restructure the entire department next quarter",
    ];
    const mockCtx = { db: { insert: vi.fn() } };

    const result = await filterOrRetry(
      generateFn,
      otherPartyMessages,
      2,
      mockCtx as any,
    );

    expect(result).toBe(FALLBACK_TEXT);
    // 1 initial + 2 retries = 3 total calls
    expect(generateFn).toHaveBeenCalledTimes(3);
  });
});

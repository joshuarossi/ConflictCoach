/**
 * WOR-45: AI Synthesis generation — privacy filter integration tests
 *
 * Covers:
 * - AC4: Privacy response filter runs on each synthesis text against OTHER party's messages
 * - AC5: On filter violation: regenerate up to 2 times; on final failure, generic fallback + flag
 */
import { describe, test, expect, vi } from "vitest";
import {
  checkPrivacyViolation,
  filterOrRetry,
  FALLBACK_TEXT,
} from "../../convex/lib/privacyFilter";

// ---------------------------------------------------------------------------
// Test fixtures — realistic synthesis-shaped data
// ---------------------------------------------------------------------------

const INITIATOR_PRIVATE_MESSAGES = [
  "I feel like my opinions are ignored when it comes to big decisions about the project direction and technical architecture",
  "Last week they picked the database without asking me and I found out from the commit history",
  "I want us to have a shared decision-making process for important technical choices",
];

const INVITEE_PRIVATE_MESSAGES = [
  "I just want them to trust my judgment more especially on backend decisions where I have deep expertise",
  "They micromanage every technical choice and it slows us down significantly on every sprint",
  "I would like autonomy to make backend decisions without having to justify every single choice to them",
];

// ---------------------------------------------------------------------------
// AC 4: Privacy filter runs on each synthesis against OTHER party's messages
// ---------------------------------------------------------------------------
describe("AC4: Privacy filter runs on each synthesis against the OTHER party's messages", () => {
  test("forInitiator text quoting invitee's words is detected as a violation", () => {
    // forInitiator is shown TO the initiator, so it must be checked against
    // the INVITEE's private messages to prevent leaking invitee's words.
    const quotingInvitee =
      "They micromanage every technical choice and it slows us down significantly on every sprint — consider this perspective.";
    const result = checkPrivacyViolation(quotingInvitee, INVITEE_PRIVATE_MESSAGES);
    expect(result.isViolation).toBe(true);
  });

  test("forInvitee text quoting initiator's words is detected as a violation", () => {
    // forInvitee is shown TO the invitee, so it must be checked against
    // the INITIATOR's private messages to prevent leaking initiator's words.
    const quotingInitiator =
      "They said they feel like their opinions are ignored when it comes to big decisions about the project direction and technical architecture.";
    const result = checkPrivacyViolation(quotingInitiator, INITIATOR_PRIVATE_MESSAGES);
    expect(result.isViolation).toBe(true);
  });

  test("clean forInitiator text passes privacy check against invitee messages", () => {
    const cleanText =
      "There are areas of common ground around wanting better communication. Consider approaching with curiosity.";
    const result = checkPrivacyViolation(cleanText, INVITEE_PRIVATE_MESSAGES);
    expect(result.isViolation).toBe(false);
  });

  test("clean forInvitee text passes privacy check against initiator messages", () => {
    const cleanText =
      "Both parties value the partnership. Try framing your needs as preferences rather than demands.";
    const result = checkPrivacyViolation(cleanText, INITIATOR_PRIVATE_MESSAGES);
    expect(result.isViolation).toBe(false);
  });

  test("privacy check direction matters — initiator's own words do not trigger against invitee's messages", () => {
    // Text that quotes initiator's own words should NOT trigger violation
    // when checked against invitee's messages (correct direction)
    const quotingInitiatorWords =
      "You mentioned feeling like your opinions are ignored when it comes to big decisions about the project direction and technical architecture.";
    const resultAgainstInvitee = checkPrivacyViolation(
      quotingInitiatorWords,
      INVITEE_PRIVATE_MESSAGES,
    );
    expect(resultAgainstInvitee.isViolation).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC 5: Regeneration on filter violation — retry up to 2 times, fallback on failure
// ---------------------------------------------------------------------------
describe("AC5: On filter violation, regenerate up to 2 times; fallback on final failure", () => {
  test("clean synthesis on first attempt returns immediately without retry", async () => {
    const cleanSynthesis =
      "There are shared goals around better communication practices.";
    const generateFn = vi.fn().mockResolvedValue(cleanSynthesis);
    const mockCtx = { db: { insert: vi.fn() } };

    const result = await filterOrRetry(
      generateFn,
      INVITEE_PRIVATE_MESSAGES,
      2,
      mockCtx as any,
    );

    expect(result).toBe(cleanSynthesis);
    expect(generateFn).toHaveBeenCalledTimes(1);
  });

  test("privacy-violating first attempt triggers retry; clean second attempt succeeds", async () => {
    const violating =
      "They just want them to trust my judgment more especially on backend decisions where I have deep expertise.";
    const clean = "There is a desire for greater autonomy in technical decisions.";
    const generateFn = vi
      .fn()
      .mockResolvedValueOnce(violating)
      .mockResolvedValueOnce(clean);
    const mockCtx = { db: { insert: vi.fn() } };

    const result = await filterOrRetry(
      generateFn,
      INVITEE_PRIVATE_MESSAGES,
      2,
      mockCtx as any,
    );

    expect(result).toBe(clean);
    expect(generateFn).toHaveBeenCalledTimes(2);
    expect(mockCtx.db.insert).not.toHaveBeenCalled();
  });

  test("three consecutive violations returns FALLBACK_TEXT and writes audit log", async () => {
    const violating =
      "They just want them to trust my judgment more especially on backend decisions where I have deep expertise.";
    const generateFn = vi.fn().mockResolvedValue(violating);
    const mockInsert = vi.fn();
    const mockCtx = { db: { insert: mockInsert } };

    const result = await filterOrRetry(
      generateFn,
      INVITEE_PRIVATE_MESSAGES,
      2,
      mockCtx as any,
    );

    expect(result).toBe(FALLBACK_TEXT);
    expect(generateFn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(
      "auditLog",
      expect.objectContaining({
        action: "PRIVACY_FILTER_FAILURE",
      }),
    );
  });

  test("audit log entry includes match details metadata", async () => {
    const violating =
      "They just want them to trust my judgment more especially on backend decisions where I have deep expertise.";
    const generateFn = vi.fn().mockResolvedValue(violating);
    const mockInsert = vi.fn();
    const mockCtx = { db: { insert: mockInsert } };

    await filterOrRetry(generateFn, INVITEE_PRIVATE_MESSAGES, 2, mockCtx as any);

    const auditEntry = mockInsert.mock.calls[0][1];
    expect(auditEntry.metadata).toBeDefined();
    expect(auditEntry.metadata.matchDetails).toBeDefined();
    expect(auditEntry.metadata.attempts).toBe(3);
  });
});

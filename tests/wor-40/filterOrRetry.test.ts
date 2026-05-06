/**
 * WOR-40: Privacy response filter — filterOrRetry tests
 *
 * Covers AC 5 (retry logic) and AC 6 (admin flagging on final failure).
 */
import { describe, test, expect, vi } from "vitest";
import { filterOrRetry, FALLBACK_TEXT } from "../../convex/lib/privacyFilter";

// ---------------------------------------------------------------------------
// AC 5: Retry logic — up to 2 regeneration attempts if violation detected
// ---------------------------------------------------------------------------
describe("AC 5: Retry logic via filterOrRetry", () => {
  test("returns clean output on first attempt without retrying", async () => {
    const cleanOutput =
      "Both parties have legitimate concerns worth discussing.";
    const generateFn = vi.fn().mockResolvedValue(cleanOutput);
    const otherPartyMessages = [
      "my boss never listens to me and always dismisses my ideas in front of clients every single time",
    ];
    const mockCtx = { db: { insert: vi.fn() } };

    const result = await filterOrRetry(
      generateFn,
      otherPartyMessages,
      2,
      mockCtx as any,
    );

    expect(result).toBe(cleanOutput);
    expect(generateFn).toHaveBeenCalledTimes(1);
  });

  test("retries once when first attempt violates, returns clean second attempt", async () => {
    const violatingOutput =
      "They said my boss never listens to me and always dismisses my ideas in front of clients every single time.";
    const cleanOutput = "There are concerns about workplace communication.";
    const generateFn = vi
      .fn()
      .mockResolvedValueOnce(violatingOutput)
      .mockResolvedValueOnce(cleanOutput);
    const otherPartyMessages = [
      "my boss never listens to me and always dismisses my ideas in front of clients every single time",
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

  test("returns fallback text after all retries exhausted (maxRetries=2 means 3 total attempts)", async () => {
    const violatingOutput =
      "They said my boss never listens to me and always dismisses my ideas in front of clients every single time.";
    const generateFn = vi.fn().mockResolvedValue(violatingOutput);
    const otherPartyMessages = [
      "my boss never listens to me and always dismisses my ideas in front of clients every single time",
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

// ---------------------------------------------------------------------------
// AC 6: On final failure — returns generic fallback text + flags for admin
//        review via audit log
// ---------------------------------------------------------------------------
describe("AC 6: Admin flagging on final failure", () => {
  test("inserts audit log entry with PRIVACY_FILTER_FAILURE on final failure", async () => {
    const violatingOutput =
      "They said my boss never listens to me and always dismisses my ideas in front of clients every single time.";
    const generateFn = vi.fn().mockResolvedValue(violatingOutput);
    const otherPartyMessages = [
      "my boss never listens to me and always dismisses my ideas in front of clients every single time",
    ];
    const mockInsert = vi.fn();
    const mockCtx = { db: { insert: mockInsert } };

    await filterOrRetry(generateFn, otherPartyMessages, 2, mockCtx as any);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert).toHaveBeenCalledWith(
      "auditLog",
      expect.objectContaining({
        action: "PRIVACY_FILTER_FAILURE",
      }),
    );
    // Metadata should contain match details
    const insertCall = mockInsert.mock.calls[0][1];
    expect(insertCall).toHaveProperty("metadata");
    expect(insertCall.metadata).toBeDefined();
  });

  test("returns the generic fallback text constant", async () => {
    expect(FALLBACK_TEXT).toBe(
      "I've reviewed both perspectives. There are areas of common ground and areas that will need discussion. I encourage you to approach the joint session with curiosity about the other person's experience.",
    );
  });

  test("does NOT insert audit log when generation succeeds", async () => {
    const cleanOutput = "Both parties have concerns worth discussing.";
    const generateFn = vi.fn().mockResolvedValue(cleanOutput);
    const otherPartyMessages = [
      "my boss never listens to me and always dismisses my ideas in front of clients every single time",
    ];
    const mockInsert = vi.fn();
    const mockCtx = { db: { insert: mockInsert } };

    await filterOrRetry(generateFn, otherPartyMessages, 2, mockCtx as any);

    expect(mockInsert).not.toHaveBeenCalled();
  });
});

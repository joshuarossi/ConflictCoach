/**
 * WOR-46: enterJointSession mutation — unit tests
 *
 * Tests the server-side mutation that transitions a case from
 * READY_FOR_JOINT → JOINT_ACTIVE when a party clicks "Enter Joint Session".
 *
 * Covers:
 * - Successful transition from READY_FOR_JOINT → JOINT_ACTIVE
 * - Rejection when case is not in READY_FOR_JOINT status (CONFLICT)
 * - Rejection when caller is not a party to the case (FORBIDDEN)
 */
import { describe, test, expect, vi } from "vitest";
import { ConvexError } from "convex/values";

import { enterJointSession } from "../../convex/jointChat";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const CASE_ID = "cases:test-case" as any;
const USER_ID = "users:party-a" as any;
const NON_PARTY_USER_ID = "users:stranger" as any;

function makeMockCtx(overrides: {
  caseStatus?: string;
  callerUserId?: string;
  hasPartyState?: boolean;
} = {}) {
  const {
    caseStatus = "READY_FOR_JOINT",
    callerUserId = USER_ID,
    hasPartyState = true,
  } = overrides;

  const caseDoc = {
    _id: CASE_ID,
    status: caseStatus,
    isSolo: false,
    initiatorUserId: USER_ID,
    inviteeUserId: "users:party-b",
    category: "workplace",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const partyState = hasPartyState
    ? {
        _id: "partyStates:ps1",
        caseId: CASE_ID,
        userId: callerUserId,
        role: "INITIATOR" as const,
        privateCoachingCompletedAt: Date.now(),
      }
    : null;

  return {
    auth: {
      getUserIdentity: vi.fn().mockResolvedValue({
        subject: `${callerUserId}|session-1`,
      }),
    },
    db: {
      get: vi.fn().mockImplementation(async (id: string) => {
        if (id === CASE_ID) return caseDoc;
        // User lookup for requireAuth
        if (id === callerUserId)
          return { _id: callerUserId, role: "USER", displayName: "Party A" };
        return null;
      }),
      query: vi.fn().mockReturnValue({
        withIndex: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(partyState),
        }),
      }),
      patch: vi.fn().mockResolvedValue(undefined),
    },
    scheduler: {
      runAfter: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("WOR-46: enterJointSession mutation", () => {
  test("transitions case from READY_FOR_JOINT to JOINT_ACTIVE", async () => {
    const ctx = makeMockCtx({ caseStatus: "READY_FOR_JOINT" });

    await enterJointSession.handler(ctx as any, { caseId: CASE_ID });

    // The mutation should patch the case status to JOINT_ACTIVE
    expect(ctx.db.patch).toHaveBeenCalledWith(
      CASE_ID,
      expect.objectContaining({ status: "JOINT_ACTIVE" }),
    );
  });

  test("throws CONFLICT when case is in DRAFT_PRIVATE_COACHING status", async () => {
    const ctx = makeMockCtx({ caseStatus: "DRAFT_PRIVATE_COACHING" });

    await expect(
      enterJointSession.handler(ctx as any, { caseId: CASE_ID }),
    ).rejects.toThrow(/conflict/i);
  });

  test("throws CONFLICT when case is in JOINT_ACTIVE status (already entered)", async () => {
    const ctx = makeMockCtx({ caseStatus: "JOINT_ACTIVE" });

    await expect(
      enterJointSession.handler(ctx as any, { caseId: CASE_ID }),
    ).rejects.toThrow(/conflict/i);
  });

  test("throws CONFLICT when case is in CLOSED_RESOLVED status", async () => {
    const ctx = makeMockCtx({ caseStatus: "CLOSED_RESOLVED" });

    await expect(
      enterJointSession.handler(ctx as any, { caseId: CASE_ID }),
    ).rejects.toThrow(/conflict/i);
  });

  test("throws FORBIDDEN when caller is not a party to the case", async () => {
    const ctx = makeMockCtx({
      callerUserId: NON_PARTY_USER_ID,
      hasPartyState: false,
    });

    await expect(
      enterJointSession.handler(ctx as any, { caseId: CASE_ID }),
    ).rejects.toThrow(/forbidden/i);
  });
});

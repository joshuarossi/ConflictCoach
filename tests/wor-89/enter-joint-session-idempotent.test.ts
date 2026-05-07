/**
 * WOR-89: enterJointSession idempotency — edge-case coverage
 *
 * Fills coverage gaps identified in the test review:
 * - AC3: Non-party caller when case is JOINT_ACTIVE (auth before idempotency)
 * - AC4: CLOSED_UNRESOLVED and CLOSED_ABANDONED rejections
 * - AC5: BOTH_PRIVATE_COACHING rejection
 */
import { describe, test, expect, vi } from "vitest";

import { enterJointSession } from "../../convex/jointChat";

// ---------------------------------------------------------------------------
// Test fixtures (mirrors wor-46 pattern)
// ---------------------------------------------------------------------------
const CASE_ID = "cases:test-case" as any;
const USER_ID = "users:party-a" as any;
const NON_PARTY_USER_ID = "users:stranger" as any;

function makeMockCtx(
  overrides: {
    caseStatus?: string;
    callerUserId?: string;
    hasPartyState?: boolean;
  } = {},
) {
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
// AC3: Non-party when JOINT_ACTIVE — auth rejects before idempotency guard
// ---------------------------------------------------------------------------
describe("WOR-89: enterJointSession — non-party auth ordering", () => {
  test("AC3: rejects non-party caller with FORBIDDEN even when case is JOINT_ACTIVE", async () => {
    const ctx = makeMockCtx({
      caseStatus: "JOINT_ACTIVE",
      callerUserId: NON_PARTY_USER_ID,
      hasPartyState: false,
    });

    await expect(
      enterJointSession.handler(ctx as any, { caseId: CASE_ID }),
    ).rejects.toThrow(/forbidden/i);

    // Auth failure must prevent any state mutation
    expect(ctx.db.patch).not.toHaveBeenCalled();
    expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC4: CLOSED_* statuses still reject
// ---------------------------------------------------------------------------
describe("WOR-89: enterJointSession — closed-status rejections", () => {
  test("AC4: throws CONFLICT when case is CLOSED_UNRESOLVED", async () => {
    const ctx = makeMockCtx({ caseStatus: "CLOSED_UNRESOLVED" });

    await expect(
      enterJointSession.handler(ctx as any, { caseId: CASE_ID }),
    ).rejects.toThrow(/conflict/i);
  });

  test("AC4: throws CONFLICT when case is CLOSED_ABANDONED", async () => {
    const ctx = makeMockCtx({ caseStatus: "CLOSED_ABANDONED" });

    await expect(
      enterJointSession.handler(ctx as any, { caseId: CASE_ID }),
    ).rejects.toThrow(/conflict/i);
  });
});

// ---------------------------------------------------------------------------
// AC5: Premature entry still rejected
// ---------------------------------------------------------------------------
describe("WOR-89: enterJointSession — premature-status rejections", () => {
  test("AC5: throws CONFLICT when case is BOTH_PRIVATE_COACHING", async () => {
    const ctx = makeMockCtx({ caseStatus: "BOTH_PRIVATE_COACHING" });

    await expect(
      enterJointSession.handler(ctx as any, { caseId: CASE_ID }),
    ).rejects.toThrow(/conflict/i);
  });
});

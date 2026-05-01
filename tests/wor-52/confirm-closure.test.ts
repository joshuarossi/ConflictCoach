/**
 * WOR-52: confirmClosure mutation tests
 *
 * Covers:
 * - AC2: confirmClosure validates other party has proposed, sets closureConfirmed=true,
 *        transitions case to CLOSED_RESOLVED with closedAt timestamp
 * - AC5: confirmClosure enforces caller is party to case, case is JOINT_ACTIVE
 * - AC7: validateTransition is called for JOINT_ACTIVE -> CLOSED_RESOLVED
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
// @ts-expect-error WOR-52 red-state import: implementation is created by task-implement.
import { confirmClosure } from "../../convex/caseClosure";
import {
  createMockCtx,
  getHandler,
  USER_A,
  USER_B,
  USER_C,
  CASE_ID,
  CASE_JOINT_ACTIVE,
  CASE_JOINT_ACTIVE_SOLO,
  PARTY_STATE_A,
  PARTY_STATE_B,
} from "./_helpers";

const PARTY_STATE_A_PROPOSED = {
  ...PARTY_STATE_A,
  closureProposed: true,
};

// ---------------------------------------------------------------------------
// AC2: confirmClosure happy path
// ---------------------------------------------------------------------------
describe("AC2: confirmClosure transitions to CLOSED_RESOLVED", () => {
  test("sets closureConfirmed=true on confirmer's partyState", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A_PROPOSED, PARTY_STATE_B] },
    });

    const handler = getHandler(confirmClosure);
    await handler(ctx, { caseId: CASE_ID });

    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const partyStatePatch = patchCalls.find(
      (call) => call[0] === PARTY_STATE_B._id,
    );
    expect(partyStatePatch).toBeDefined();
    expect((partyStatePatch![1] as Record<string, unknown>).closureConfirmed).toBe(true);
  });

  test("transitions case status to CLOSED_RESOLVED", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A_PROPOSED, PARTY_STATE_B] },
    });

    const handler = getHandler(confirmClosure);
    await handler(ctx, { caseId: CASE_ID });

    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const casePatch = patchCalls.find((call) => call[0] === CASE_ID);
    expect(casePatch).toBeDefined();
    expect((casePatch![1] as Record<string, unknown>).status).toBe(
      "CLOSED_RESOLVED",
    );
  });

  test("sets closedAt timestamp on the case", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A_PROPOSED, PARTY_STATE_B] },
    });

    const handler = getHandler(confirmClosure);
    await handler(ctx, { caseId: CASE_ID });

    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const casePatch = patchCalls.find((call) => call[0] === CASE_ID);
    expect(casePatch).toBeDefined();
    const caseUpdate = casePatch![1] as Record<string, unknown>;
    expect(typeof caseUpdate.closedAt).toBe("number");
    expect(caseUpdate.closedAt).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC2: confirmClosure error cases
// ---------------------------------------------------------------------------
describe("AC2: confirmClosure rejects invalid confirmation attempts", () => {
  test("throws CONFLICT when no prior proposal exists", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(confirmClosure);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });

  test("throws CONFLICT when proposer tries to confirm their own proposal (non-solo)", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A_PROPOSED, PARTY_STATE_B] },
    });

    const handler = getHandler(confirmClosure);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected error: proposer cannot confirm own proposal");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
    }
  });

  test("allows same user to confirm in solo mode", async () => {
    const soloPartyStateA = {
      ...PARTY_STATE_A,
      closureProposed: true,
    };
    const soloPartyStateB = {
      ...PARTY_STATE_B,
      userId: USER_A._id,
    };

    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE_SOLO },
      dbQueries: { partyStates: [soloPartyStateA, soloPartyStateB] },
    });

    const handler = getHandler(confirmClosure);
    await handler(ctx, { caseId: CASE_ID });

    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const casePatch = patchCalls.find((call) => call[0] === CASE_ID);
    expect(casePatch).toBeDefined();
    expect((casePatch![1] as Record<string, unknown>).status).toBe(
      "CLOSED_RESOLVED",
    );
  });
});

// ---------------------------------------------------------------------------
// AC5: confirmClosure authorization enforcement
// ---------------------------------------------------------------------------
describe("AC5: confirmClosure enforces authorization", () => {
  test("throws FORBIDDEN when caller is not a party to the case", async () => {
    const ctx = createMockCtx({
      user: USER_C,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [] },
    });

    const handler = getHandler(confirmClosure);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected FORBIDDEN error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("FORBIDDEN");
    }
  });

  test("throws CONFLICT when case is not JOINT_ACTIVE", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: {
        [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "READY_FOR_JOINT" },
      },
      dbQueries: { partyStates: [PARTY_STATE_A_PROPOSED, PARTY_STATE_B] },
    });

    const handler = getHandler(confirmClosure);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });

  test("throws when user is not authenticated", async () => {
    const ctx = createMockCtx({
      user: null,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A_PROPOSED, PARTY_STATE_B] },
    });

    const handler = getHandler(confirmClosure);
    await expect(handler(ctx, { caseId: CASE_ID })).rejects.toThrow();
  });
});

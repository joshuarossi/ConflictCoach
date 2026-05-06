/**
 * WOR-52: rejectClosure mutation tests
 *
 * Covers:
 * - AC4: A mutation to clear the proposer's closureProposed flag exists.
 *        After rejection, case remains JOINT_ACTIVE and chat continues.
 * - AC5: rejectClosure enforces caller is party to case, case is JOINT_ACTIVE
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import { rejectClosure } from "../../convex/caseClosure";
import {
  createMockCtx,
  getHandler,
  USER_A,
  USER_B,
  USER_C,
  CASE_ID,
  CASE_JOINT_ACTIVE,
  PARTY_STATE_A,
  PARTY_STATE_B,
} from "./_helpers";

const PARTY_STATE_A_PROPOSED = {
  ...PARTY_STATE_A,
  closureProposed: true,
};

// ---------------------------------------------------------------------------
// AC4: rejectClosure clears closureProposed
// ---------------------------------------------------------------------------
describe("AC4: rejectClosure clears closureProposed flag", () => {
  test("clears closureProposed on the proposer's partyState", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A_PROPOSED, PARTY_STATE_B] },
    });

    const handler = getHandler(rejectClosure);
    await handler(ctx, { caseId: CASE_ID });

    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    // The proposer's (party A) closureProposed should be cleared
    const proposerPatch = patchCalls.find(
      (call) => call[0] === PARTY_STATE_A._id,
    );
    expect(proposerPatch).toBeDefined();
    expect((proposerPatch![1] as Record<string, unknown>).closureProposed).toBe(
      false,
    );
  });

  test("case remains in JOINT_ACTIVE status after rejection", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A_PROPOSED, PARTY_STATE_B] },
    });

    const handler = getHandler(rejectClosure);
    await handler(ctx, { caseId: CASE_ID });

    // Case status should NOT be changed; no patch with status field on case
    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const casePatch = patchCalls.find((call) => call[0] === CASE_ID);
    if (casePatch) {
      expect((casePatch[1] as Record<string, unknown>).status).toBeUndefined();
    }
  });

  test("throws CONFLICT when no prior proposal exists to reject", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(rejectClosure);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });
});

// ---------------------------------------------------------------------------
// AC5: rejectClosure authorization enforcement
// ---------------------------------------------------------------------------
describe("AC5: rejectClosure enforces authorization", () => {
  test("throws FORBIDDEN when caller is not a party to the case", async () => {
    const ctx = createMockCtx({
      user: USER_C,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [] },
    });

    const handler = getHandler(rejectClosure);
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
        [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "CLOSED_RESOLVED" },
      },
      dbQueries: { partyStates: [PARTY_STATE_A_PROPOSED, PARTY_STATE_B] },
    });

    const handler = getHandler(rejectClosure);
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

    const handler = getHandler(rejectClosure);
    await expect(handler(ctx, { caseId: CASE_ID })).rejects.toThrow();
  });
});

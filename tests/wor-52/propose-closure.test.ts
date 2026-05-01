/**
 * WOR-52: proposeClosure mutation tests
 *
 * Covers:
 * - AC1: proposeClosure sets caller's partyStates.closureProposed=true
 *        and stores closureSummary on case
 * - AC5: proposeClosure enforces caller is party to case, case is JOINT_ACTIVE
 * - AC7: validateTransition is called for status-changing flows
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
// @ts-expect-error WOR-52 red-state import: implementation is created by task-implement.
import { proposeClosure } from "../../convex/caseClosure";
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

// ---------------------------------------------------------------------------
// AC1: proposeClosure sets closureProposed and stores closureSummary
// ---------------------------------------------------------------------------
describe("AC1: proposeClosure sets closureProposed and closureSummary", () => {
  test("sets closureProposed=true on caller's partyState", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(proposeClosure);
    await handler(ctx, {
      caseId: CASE_ID,
      closureSummary: "We agreed to split the cost 50/50",
    });

    // Should patch the caller's partyState with closureProposed=true
    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const partyStatePatch = patchCalls.find(
      (call) => call[0] === PARTY_STATE_A._id,
    );
    expect(partyStatePatch).toBeDefined();
    expect((partyStatePatch![1] as Record<string, unknown>).closureProposed).toBe(true);
  });

  test("stores closureSummary on the case", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(proposeClosure);
    await handler(ctx, {
      caseId: CASE_ID,
      closureSummary: "We agreed to split the cost 50/50",
    });

    // Should patch the case with the closureSummary
    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const casePatch = patchCalls.find((call) => call[0] === CASE_ID);
    expect(casePatch).toBeDefined();
    expect((casePatch![1] as Record<string, unknown>).closureSummary).toBe(
      "We agreed to split the cost 50/50",
    );
  });

  test("party B can also propose closure", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(proposeClosure);
    await handler(ctx, {
      caseId: CASE_ID,
      closureSummary: "Jordan's proposal summary",
    });

    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const partyStatePatch = patchCalls.find(
      (call) => call[0] === PARTY_STATE_B._id,
    );
    expect(partyStatePatch).toBeDefined();
    expect((partyStatePatch![1] as Record<string, unknown>).closureProposed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC5: proposeClosure enforces authorization and state
// ---------------------------------------------------------------------------
describe("AC5: proposeClosure enforces caller is party and case is JOINT_ACTIVE", () => {
  test("throws FORBIDDEN when caller is not a party to the case", async () => {
    const ctx = createMockCtx({
      user: USER_C,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [] },
    });

    const handler = getHandler(proposeClosure);
    try {
      await handler(ctx, {
        caseId: CASE_ID,
        closureSummary: "summary",
      });
      expect.fail("Expected FORBIDDEN error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("FORBIDDEN");
    }
  });

  test("throws CONFLICT when case is not JOINT_ACTIVE", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: {
        [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "BOTH_PRIVATE_COACHING" },
      },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(proposeClosure);
    try {
      await handler(ctx, {
        caseId: CASE_ID,
        closureSummary: "summary",
      });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });

  test("throws CONFLICT when case is CLOSED_RESOLVED", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: {
        [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "CLOSED_RESOLVED" },
      },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(proposeClosure);
    try {
      await handler(ctx, {
        caseId: CASE_ID,
        closureSummary: "summary",
      });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });

  test("throws CONFLICT when case is CLOSED_UNRESOLVED", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: {
        [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "CLOSED_UNRESOLVED" },
      },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(proposeClosure);
    try {
      await handler(ctx, {
        caseId: CASE_ID,
        closureSummary: "summary",
      });
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
      dbQueries: { partyStates: [PARTY_STATE_A] },
    });

    const handler = getHandler(proposeClosure);
    await expect(
      handler(ctx, { caseId: CASE_ID, closureSummary: "summary" }),
    ).rejects.toThrow();
  });
});

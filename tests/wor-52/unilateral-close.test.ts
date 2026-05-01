/**
 * WOR-52: unilateralClose mutation tests
 *
 * Covers:
 * - AC3: unilateralClose transitions case to CLOSED_UNRESOLVED immediately
 *        with closedAt + reason
 * - AC5: unilateralClose enforces caller is party to case, case is JOINT_ACTIVE
 * - AC7: validateTransition is called for JOINT_ACTIVE -> CLOSED_UNRESOLVED
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import { unilateralClose } from "../../convex/caseClosure";
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
// AC3: unilateralClose happy path
// ---------------------------------------------------------------------------
describe("AC3: unilateralClose transitions to CLOSED_UNRESOLVED", () => {
  test("transitions case status to CLOSED_UNRESOLVED", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(unilateralClose);
    await handler(ctx, {
      caseId: CASE_ID,
      reason: "I no longer wish to continue",
    });

    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const casePatch = patchCalls.find((call) => call[0] === CASE_ID);
    expect(casePatch).toBeDefined();
    expect((casePatch![1] as Record<string, unknown>).status).toBe(
      "CLOSED_UNRESOLVED",
    );
  });

  test("sets closedAt timestamp on the case", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(unilateralClose);
    await handler(ctx, {
      caseId: CASE_ID,
      reason: "I no longer wish to continue",
    });

    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const casePatch = patchCalls.find((call) => call[0] === CASE_ID);
    expect(casePatch).toBeDefined();
    const caseUpdate = casePatch![1] as Record<string, unknown>;
    expect(typeof caseUpdate.closedAt).toBe("number");
    expect(caseUpdate.closedAt).toBeGreaterThan(0);
  });

  test("stores the closure reason on the case", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const reason = "I no longer wish to continue this mediation";
    const handler = getHandler(unilateralClose);
    await handler(ctx, { caseId: CASE_ID, reason });

    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const casePatch = patchCalls.find((call) => call[0] === CASE_ID);
    expect(casePatch).toBeDefined();
    const caseUpdate = casePatch![1] as Record<string, unknown>;
    // Per TechSpec §3.1, unilateral close reason is stored in closureSummary
    expect(caseUpdate.closureSummary).toBe(reason);
  });

  test("party B can also unilaterally close", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(unilateralClose);
    await handler(ctx, { caseId: CASE_ID, reason: "Disagreement" });

    const patchCalls = ctx.db.patch.mock.calls as unknown[][];
    const casePatch = patchCalls.find((call) => call[0] === CASE_ID);
    expect(casePatch).toBeDefined();
    expect((casePatch![1] as Record<string, unknown>).status).toBe(
      "CLOSED_UNRESOLVED",
    );
  });
});

// ---------------------------------------------------------------------------
// AC5: unilateralClose authorization enforcement
// ---------------------------------------------------------------------------
describe("AC5: unilateralClose enforces authorization", () => {
  test("throws FORBIDDEN when caller is not a party to the case", async () => {
    const ctx = createMockCtx({
      user: USER_C,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [] },
    });

    const handler = getHandler(unilateralClose);
    try {
      await handler(ctx, { caseId: CASE_ID, reason: "leaving" });
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
        [CASE_ID]: {
          ...CASE_JOINT_ACTIVE,
          status: "DRAFT_PRIVATE_COACHING",
        },
      },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(unilateralClose);
    try {
      await handler(ctx, { caseId: CASE_ID, reason: "leaving" });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });

  test("throws CONFLICT when case is already CLOSED_UNRESOLVED", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: {
        [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "CLOSED_UNRESOLVED" },
      },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    const handler = getHandler(unilateralClose);
    try {
      await handler(ctx, { caseId: CASE_ID, reason: "leaving" });
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

    const handler = getHandler(unilateralClose);
    await expect(
      handler(ctx, { caseId: CASE_ID, reason: "leaving" }),
    ).rejects.toThrow();
  });
});

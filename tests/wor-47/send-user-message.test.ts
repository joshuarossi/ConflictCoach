/**
 * WOR-47: jointChat/sendUserMessage mutation tests
 *
 * Covers:
 * - AC4: sendUserMessage inserts a jointMessage with authorType=USER,
 *        schedules generateCoachResponse action
 * - AC7: sendUserMessage rejects if case is not JOINT_ACTIVE (throws CONFLICT)
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import { sendUserMessage } from "../../convex/jointChat";
import {
  createMockCtx,
  USER_A,
  CASE_ID,
  CASE_JOINT_ACTIVE,
  PARTY_STATE_A,
} from "./_helpers";

function getHandler(fn: any): any {
  return typeof fn === "function" ? fn : fn.handler;
}

// ---------------------------------------------------------------------------
// AC4: sendUserMessage inserts jointMessage and schedules generateCoachResponse
// ---------------------------------------------------------------------------
describe("AC4: sendUserMessage inserts jointMessage and schedules generateCoachResponse", () => {
  test("inserts a jointMessage with authorType=USER and status=COMPLETE", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A] },
    });

    const handler = getHandler(sendUserMessage);
    await handler(ctx, { caseId: CASE_ID, content: "Hello world" });

    expect(ctx.db.insert).toHaveBeenCalledTimes(1);
    const insertCalls = ctx.db.insert.mock.calls as unknown[][];
    const insertCall = insertCalls[0];
    expect(insertCall[0]).toBe("jointMessages");

    const doc = insertCall[1] as Record<string, any>;
    expect(doc.caseId).toBe(CASE_ID);
    expect(doc.authorType).toBe("USER");
    expect(doc.authorUserId).toBe(USER_A._id);
    expect(doc.content).toBe("Hello world");
    expect(doc.status).toBe("COMPLETE");
    expect(typeof doc.createdAt).toBe("number");
  });

  test("schedules generateCoachResponse action after inserting message", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A] },
    });

    const handler = getHandler(sendUserMessage);
    await handler(ctx, { caseId: CASE_ID, content: "Hello world" });

    expect(ctx.scheduler.runAfter).toHaveBeenCalledTimes(1);
    const schedulerCalls = ctx.scheduler.runAfter.mock.calls as unknown[][];
    // First arg should be 0 (immediate scheduling per TechSpec §2.1)
    expect(schedulerCalls[0][0]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AC7: sendUserMessage rejects if case is not JOINT_ACTIVE
// ---------------------------------------------------------------------------
describe("AC7: sendUserMessage rejects if case is not JOINT_ACTIVE", () => {
  test("throws CONFLICT when case is READY_FOR_JOINT", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "READY_FOR_JOINT" } },
      dbQueries: { partyStates: [PARTY_STATE_A] },
    });

    const handler = getHandler(sendUserMessage);
    try {
      await handler(ctx, { caseId: CASE_ID, content: "test" });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });

  test("throws CONFLICT when case is CLOSED_RESOLVED", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "CLOSED_RESOLVED" } },
      dbQueries: { partyStates: [PARTY_STATE_A] },
    });

    const handler = getHandler(sendUserMessage);
    try {
      await handler(ctx, { caseId: CASE_ID, content: "test" });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });

  test("throws CONFLICT when case is BOTH_PRIVATE_COACHING", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "BOTH_PRIVATE_COACHING" } },
      dbQueries: { partyStates: [PARTY_STATE_A] },
    });

    const handler = getHandler(sendUserMessage);
    try {
      await handler(ctx, { caseId: CASE_ID, content: "test" });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });

  test("throws CONFLICT when case is DRAFT_PRIVATE_COACHING", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "DRAFT_PRIVATE_COACHING" } },
      dbQueries: { partyStates: [PARTY_STATE_A] },
    });

    const handler = getHandler(sendUserMessage);
    try {
      await handler(ctx, { caseId: CASE_ID, content: "test" });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });
});

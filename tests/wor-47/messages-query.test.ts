/**
 * WOR-47: jointChat/messages query tests
 *
 * Covers:
 * - AC1: messages query returns all jointMessages for a case, ordered by createdAt
 * - AC2: Query enforces caller is a party to the case (via partyStates lookup)
 * - AC3: Query rejects if case is not in JOINT_ACTIVE or CLOSED_* status
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import { messages } from "../../convex/jointChat";
import {
  createMockCtx,
  USER_A,
  USER_B,
  USER_C,
  CASE_ID,
  CASE_JOINT_ACTIVE,
  PARTY_STATE_A,
} from "./_helpers";

function getHandler(fn: any): any {
  return typeof fn === "function" ? fn : fn.handler;
}

// ---------------------------------------------------------------------------
// AC1: messages query returns all jointMessages for a case, ordered by createdAt
// ---------------------------------------------------------------------------
describe("AC1: messages query returns all jointMessages ordered by createdAt", () => {
  test("returns messages sorted ascending by createdAt", async () => {
    const msg1 = {
      _id: "jointMessages:m1",
      caseId: CASE_ID,
      authorType: "USER",
      authorUserId: USER_A._id,
      content: "Hello",
      status: "COMPLETE",
      createdAt: 3000,
    };
    const msg2 = {
      _id: "jointMessages:m2",
      caseId: CASE_ID,
      authorType: "COACH",
      content: "Welcome",
      status: "COMPLETE",
      createdAt: 1000,
    };
    const msg3 = {
      _id: "jointMessages:m3",
      caseId: CASE_ID,
      authorType: "USER",
      authorUserId: USER_B._id,
      content: "Hi",
      status: "COMPLETE",
      createdAt: 2000,
    };

    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: {
        partyStates: [PARTY_STATE_A],
        jointMessages: [msg1, msg2, msg3],
      },
    });

    const handler = getHandler(messages);
    const result = await handler(ctx, { caseId: CASE_ID });

    expect(result).toHaveLength(3);
    expect(result[0].createdAt).toBeLessThanOrEqual(result[1].createdAt);
    expect(result[1].createdAt).toBeLessThanOrEqual(result[2].createdAt);
    expect(result[0]._id).toBe("jointMessages:m2");
    expect(result[1]._id).toBe("jointMessages:m3");
    expect(result[2]._id).toBe("jointMessages:m1");
  });

  test("returns all messages for the case", async () => {
    const msgs = [
      { _id: "jm:1", caseId: CASE_ID, authorType: "USER", authorUserId: USER_A._id, content: "a", status: "COMPLETE", createdAt: 100 },
      { _id: "jm:2", caseId: CASE_ID, authorType: "COACH", content: "b", status: "COMPLETE", createdAt: 200 },
      { _id: "jm:3", caseId: CASE_ID, authorType: "USER", authorUserId: USER_B._id, content: "c", status: "COMPLETE", createdAt: 300 },
      { _id: "jm:4", caseId: CASE_ID, authorType: "COACH", content: "d", status: "COMPLETE", createdAt: 400 },
    ];

    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: {
        partyStates: [PARTY_STATE_A],
        jointMessages: msgs,
      },
    });

    const handler = getHandler(messages);
    const result = await handler(ctx, { caseId: CASE_ID });

    expect(result).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// AC2: Query enforces caller is a party to the case
// ---------------------------------------------------------------------------
describe("AC2: Query enforces caller is a party to the case", () => {
  test("throws FORBIDDEN when caller is not a party", async () => {
    const ctx = createMockCtx({
      user: USER_C,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: {
        partyStates: [],
        jointMessages: [],
      },
    });

    const handler = getHandler(messages);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected FORBIDDEN error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("FORBIDDEN");
    }
  });

  test("succeeds when caller is a party", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: {
        partyStates: [PARTY_STATE_A],
        jointMessages: [],
      },
    });

    const handler = getHandler(messages);
    const result = await handler(ctx, { caseId: CASE_ID });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC3: Query rejects if case is not in JOINT_ACTIVE or CLOSED_* status
// ---------------------------------------------------------------------------
describe("AC3: Query rejects if case is not in JOINT_ACTIVE or CLOSED_* status", () => {
  test("throws CONFLICT when case is BOTH_PRIVATE_COACHING", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "BOTH_PRIVATE_COACHING" } },
      dbQueries: { partyStates: [PARTY_STATE_A], jointMessages: [] },
    });

    const handler = getHandler(messages);
    try {
      await handler(ctx, { caseId: CASE_ID });
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
      dbQueries: { partyStates: [PARTY_STATE_A], jointMessages: [] },
    });

    const handler = getHandler(messages);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });

  test("throws CONFLICT when case is READY_FOR_JOINT", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "READY_FOR_JOINT" } },
      dbQueries: { partyStates: [PARTY_STATE_A], jointMessages: [] },
    });

    const handler = getHandler(messages);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected CONFLICT error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
    }
  });

  test("succeeds when case is JOINT_ACTIVE", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [PARTY_STATE_A], jointMessages: [] },
    });

    const handler = getHandler(messages);
    const result = await handler(ctx, { caseId: CASE_ID });
    expect(Array.isArray(result)).toBe(true);
  });

  test("succeeds when case is CLOSED_RESOLVED", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "CLOSED_RESOLVED" } },
      dbQueries: { partyStates: [PARTY_STATE_A], jointMessages: [] },
    });

    const handler = getHandler(messages);
    const result = await handler(ctx, { caseId: CASE_ID });
    expect(Array.isArray(result)).toBe(true);
  });

  test("succeeds when case is CLOSED_UNRESOLVED", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "CLOSED_UNRESOLVED" } },
      dbQueries: { partyStates: [PARTY_STATE_A], jointMessages: [] },
    });

    const handler = getHandler(messages);
    const result = await handler(ctx, { caseId: CASE_ID });
    expect(Array.isArray(result)).toBe(true);
  });

  test("succeeds when case is CLOSED_ABANDONED", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: { ...CASE_JOINT_ACTIVE, status: "CLOSED_ABANDONED" } },
      dbQueries: { partyStates: [PARTY_STATE_A], jointMessages: [] },
    });

    const handler = getHandler(messages);
    const result = await handler(ctx, { caseId: CASE_ID });
    expect(Array.isArray(result)).toBe(true);
  });
});

/**
 * WOR-75 AC1: User B cannot access User A's private coaching messages (FORBIDDEN).
 * WOR-75 AC5: Privacy violations result in clear FORBIDDEN errors, not empty results.
 *
 * Tests the privateCoaching.myMessages query handler to verify that:
 * - A user who is NOT a party to the case gets FORBIDDEN (not empty array).
 * - A user who IS a party only sees their own messages.
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import { myMessages } from "../../convex/privateCoaching";
import {
  createMockCtx,
  getHandler,
  USER_A,
  USER_B,
  USER_A_PRIVATE_MESSAGES,
  USER_B_PRIVATE_MESSAGES,
  CASE_ID,
  CASE_BOTH_PC,
} from "./_helpers";

const handler = getHandler(myMessages);

describe("AC1: User B cannot access User A's private coaching messages", () => {
  test("User B calling myMessages for a case they are not party to throws FORBIDDEN", async () => {
    // User C is not a party — simulate a third user trying to read
    const userC = {
      _id: "users:userC",
      email: "userC@test.com",
      role: "USER" as const,
      createdAt: 1002,
    };

    const ctx = createMockCtx({
      user: userC,
      dbGet: { [CASE_ID]: CASE_BOTH_PC },
      dbQueries: {
        privateMessages: USER_A_PRIVATE_MESSAGES,
      },
    });

    await expect(handler(ctx, { caseId: CASE_ID })).rejects.toThrow(
      ConvexError,
    );

    try {
      await handler(ctx, { caseId: CASE_ID });
    } catch (err) {
      expect(err).toBeInstanceOf(ConvexError);
      const data = (err as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("FORBIDDEN");
    }
  });

  test("User A can only see their own private messages, not User B's", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_BOTH_PC },
      // Load BOTH parties' messages so the test validates handler filtering,
      // not just that the mock was pre-filtered.
      dbQueries: {
        privateMessages: [...USER_A_PRIVATE_MESSAGES, ...USER_B_PRIVATE_MESSAGES],
      },
    });

    const result = await handler(ctx, { caseId: CASE_ID });

    // All returned messages must belong to User A — none of User B's
    for (const msg of result) {
      expect(msg.userId).toBe(USER_A._id);
    }
    expect(result.length).toBe(USER_A_PRIVATE_MESSAGES.length);
  });

  test("User B can only see their own private messages, not User A's", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: { [CASE_ID]: CASE_BOTH_PC },
      // Load BOTH parties' messages so the test validates handler filtering,
      // not just that the mock was pre-filtered.
      dbQueries: {
        privateMessages: [...USER_A_PRIVATE_MESSAGES, ...USER_B_PRIVATE_MESSAGES],
      },
    });

    const result = await handler(ctx, { caseId: CASE_ID });

    for (const msg of result) {
      expect(msg.userId).toBe(USER_B._id);
    }
    expect(result.length).toBe(USER_B_PRIVATE_MESSAGES.length);
  });
});

describe("AC5: FORBIDDEN errors are explicit, not empty results or silent failures", () => {
  test("error is a ConvexError with code FORBIDDEN and a descriptive message", async () => {
    const userC = {
      _id: "users:userC",
      email: "userC@test.com",
      role: "USER" as const,
      createdAt: 1002,
    };

    const ctx = createMockCtx({
      user: userC,
      dbGet: { [CASE_ID]: CASE_BOTH_PC },
      dbQueries: { privateMessages: USER_A_PRIVATE_MESSAGES },
    });

    try {
      await handler(ctx, { caseId: CASE_ID });
      // Should not reach here
      expect.unreachable("Expected FORBIDDEN error");
    } catch (err) {
      expect(err).toBeInstanceOf(ConvexError);
      const data = (err as ConvexError<{ code: string; message: string; httpStatus: number }>).data;
      expect(data.code).toBe("FORBIDDEN");
      expect(data.httpStatus).toBe(403);
      expect(data.message).toBeTruthy();
    }
  });

  test("non-party access does NOT return an empty array", async () => {
    const userC = {
      _id: "users:userC",
      email: "userC@test.com",
      role: "USER" as const,
      createdAt: 1002,
    };

    const ctx = createMockCtx({
      user: userC,
      dbGet: { [CASE_ID]: CASE_BOTH_PC },
      dbQueries: { privateMessages: USER_A_PRIVATE_MESSAGES },
    });

    // The handler must throw, not return an empty array
    const promise = handler(ctx, { caseId: CASE_ID });
    await expect(promise).rejects.toThrow();
  });
});

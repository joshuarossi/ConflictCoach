/**
 * WOR-47: jointChat/mySynthesis query tests
 *
 * Covers:
 * - AC5: mySynthesis query returns caller's synthesisText from partyStates
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
// @ts-expect-error WOR-47 red-state import: implementation is created by task-implement.
import { mySynthesis } from "../../convex/jointChat";
import {
  createMockCtx,
  USER_A,
  USER_C,
  CASE_ID,
  CASE_JOINT_ACTIVE,
} from "./_helpers";

function getHandler(fn: any): any {
  return typeof fn === "function" ? fn : fn.handler;
}

// ---------------------------------------------------------------------------
// AC5: mySynthesis returns caller's synthesisText from partyStates
// ---------------------------------------------------------------------------
describe("AC5: mySynthesis returns caller's synthesisText from partyStates", () => {
  test("returns User A's synthesis when called by User A", async () => {
    const partyStateA = {
      _id: "partyStates:psA",
      caseId: CASE_ID,
      userId: USER_A._id,
      role: "INITIATOR",
      synthesisText: "User A's personalized synthesis guidance.",
      synthesisGeneratedAt: 5000,
    };

    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [partyStateA] },
    });

    const handler = getHandler(mySynthesis);
    const result = await handler(ctx, { caseId: CASE_ID });

    // Result should contain User A's synthesis text — either as a string
    // or as an object with a synthesisText property
    const text =
      typeof result === "string" ? result : result?.synthesisText;
    expect(text).toBe("User A's personalized synthesis guidance.");
  });

  test("returns null or undefined when synthesis has not been generated", async () => {
    const partyStateA = {
      _id: "partyStates:psA",
      caseId: CASE_ID,
      userId: USER_A._id,
      role: "INITIATOR",
      // No synthesisText set
    };

    const ctx = createMockCtx({
      user: USER_A,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [partyStateA] },
    });

    const handler = getHandler(mySynthesis);
    const result = await handler(ctx, { caseId: CASE_ID });

    const text =
      typeof result === "string" ? result : result?.synthesisText;
    expect(text == null || text === undefined).toBe(true);
  });

  test("enforces party-to-case authorization", async () => {
    const ctx = createMockCtx({
      user: USER_C,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [] },
    });

    const handler = getHandler(mySynthesis);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected FORBIDDEN error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("FORBIDDEN");
    }
  });
});

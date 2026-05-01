/**
 * WOR-47: Auth enforcement tests for all jointChat functions
 *
 * Covers:
 * - AC6: All functions enforce auth + party-to-case authorization
 *
 * Tests that unauthenticated callers receive UNAUTHENTICATED errors
 * for every exported function in the jointChat module.
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import { messages, sendUserMessage, mySynthesis } from "../../convex/jointChat";
import { createMockCtx, CASE_ID } from "./_helpers";

function getHandler(fn: any): any {
  return typeof fn === "function" ? fn : fn.handler;
}

// ---------------------------------------------------------------------------
// AC6: All functions enforce auth + party-to-case authorization
// ---------------------------------------------------------------------------
describe("AC6: All functions enforce auth — unauthenticated callers rejected", () => {
  test("messages query throws UNAUTHENTICATED when not logged in", async () => {
    const ctx = createMockCtx({ user: null });

    const handler = getHandler(messages);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected UNAUTHENTICATED error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("UNAUTHENTICATED");
    }
  });

  test("sendUserMessage throws UNAUTHENTICATED when not logged in", async () => {
    const ctx = createMockCtx({ user: null });

    const handler = getHandler(sendUserMessage);
    try {
      await handler(ctx, { caseId: CASE_ID, content: "test" });
      expect.fail("Expected UNAUTHENTICATED error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("UNAUTHENTICATED");
    }
  });

  test("mySynthesis throws UNAUTHENTICATED when not logged in", async () => {
    const ctx = createMockCtx({ user: null });

    const handler = getHandler(mySynthesis);
    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.fail("Expected UNAUTHENTICATED error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("UNAUTHENTICATED");
    }
  });
});

describe("AC6: All functions enforce party-to-case authorization", () => {
  test("sendUserMessage throws FORBIDDEN when caller is not a party", async () => {
    const { USER_C, CASE_JOINT_ACTIVE } = await import("./_helpers");

    const ctx = createMockCtx({
      user: USER_C,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [] },
    });

    const handler = getHandler(sendUserMessage);
    try {
      await handler(ctx, { caseId: CASE_ID, content: "test" });
      expect.fail("Expected FORBIDDEN error");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      expect((e as ConvexError<any>).data.code).toBe("FORBIDDEN");
    }
  });
});

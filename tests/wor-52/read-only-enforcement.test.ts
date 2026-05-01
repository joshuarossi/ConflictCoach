/**
 * WOR-52: Read-only enforcement tests for closed cases
 *
 * Covers:
 * - AC6: CLOSED_* cases become read-only: sendUserMessage rejects with CONFLICT
 * - AC6: proposeClosure on a closed case rejects with CONFLICT
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import { sendUserMessage } from "../../convex/jointChat";
// @ts-expect-error WOR-52 red-state import: implementation is created by task-implement.
import { proposeClosure, unilateralClose } from "../../convex/caseClosure";
import {
  createMockCtx,
  getHandler,
  USER_A,
  CASE_ID,
  CASE_JOINT_ACTIVE,
  PARTY_STATE_A,
  PARTY_STATE_B,
} from "./_helpers";

const CLOSED_STATUSES = [
  "CLOSED_RESOLVED",
  "CLOSED_UNRESOLVED",
  "CLOSED_ABANDONED",
] as const;

// ---------------------------------------------------------------------------
// AC6: sendUserMessage rejects on CLOSED_* cases
// ---------------------------------------------------------------------------
describe("AC6: sendUserMessage rejects on closed cases", () => {
  for (const closedStatus of CLOSED_STATUSES) {
    test(`throws CONFLICT when case is ${closedStatus}`, async () => {
      const ctx = createMockCtx({
        user: USER_A,
        dbGet: {
          [CASE_ID]: {
            ...CASE_JOINT_ACTIVE,
            status: closedStatus,
            closedAt: Date.now(),
          },
        },
        dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
      });

      const handler = getHandler(sendUserMessage);
      try {
        await handler(ctx, { caseId: CASE_ID, content: "test message" });
        expect.fail(`Expected CONFLICT error for ${closedStatus}`);
      } catch (e) {
        expect(e).toBeInstanceOf(ConvexError);
        expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
      }
    });
  }
});

// ---------------------------------------------------------------------------
// AC6: proposeClosure rejects on CLOSED_* cases
// ---------------------------------------------------------------------------
describe("AC6: proposeClosure rejects on closed cases", () => {
  for (const closedStatus of CLOSED_STATUSES) {
    test(`throws CONFLICT when case is ${closedStatus}`, async () => {
      const ctx = createMockCtx({
        user: USER_A,
        dbGet: {
          [CASE_ID]: {
            ...CASE_JOINT_ACTIVE,
            status: closedStatus,
            closedAt: Date.now(),
          },
        },
        dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
      });

      const handler = getHandler(proposeClosure);
      try {
        await handler(ctx, {
          caseId: CASE_ID,
          closureSummary: "summary",
        });
        expect.fail(`Expected CONFLICT error for ${closedStatus}`);
      } catch (e) {
        expect(e).toBeInstanceOf(ConvexError);
        expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
      }
    });
  }
});

// ---------------------------------------------------------------------------
// AC6: unilateralClose rejects on CLOSED_* cases
// ---------------------------------------------------------------------------
describe("AC6: unilateralClose rejects on closed cases", () => {
  for (const closedStatus of CLOSED_STATUSES) {
    test(`throws CONFLICT when case is ${closedStatus}`, async () => {
      const ctx = createMockCtx({
        user: USER_A,
        dbGet: {
          [CASE_ID]: {
            ...CASE_JOINT_ACTIVE,
            status: closedStatus,
            closedAt: Date.now(),
          },
        },
        dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
      });

      const handler = getHandler(unilateralClose);
      try {
        await handler(ctx, { caseId: CASE_ID, reason: "leaving" });
        expect.fail(`Expected CONFLICT error for ${closedStatus}`);
      } catch (e) {
        expect(e).toBeInstanceOf(ConvexError);
        expect((e as ConvexError<any>).data.code).toBe("CONFLICT");
      }
    });
  }
});

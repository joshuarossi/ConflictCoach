/**
 * WOR-75 AC2: Admin cannot access either party's private coaching messages (FORBIDDEN).
 * WOR-75 AC5: Privacy violations result in FORBIDDEN errors, not silent failures.
 *
 * Tests that an admin user — who is NOT a party to the case — gets FORBIDDEN
 * when attempting to read private messages or joint messages. Admin role does
 * NOT grant cross-party read access.
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import { myMessages } from "../../convex/privateCoaching";
import { messages as jointMessages } from "../../convex/jointChat";
import { get as getCase, partyStates } from "../../convex/cases";
import {
  createMockCtx,
  getHandler,
  ADMIN_USER,
  CASE_ID,
  CASE_BOTH_PC,
  CASE_JOINT_ACTIVE,
  USER_A_PRIVATE_MESSAGES,
  PARTY_STATE_A,
  PARTY_STATE_B,
} from "./_helpers";

const myMessagesHandler = getHandler(myMessages);
const jointMessagesHandler = getHandler(jointMessages);
const getCaseHandler = getHandler(getCase);
const partyStatesHandler = getHandler(partyStates);

describe("AC2: Admin cannot access either party's private coaching messages", () => {
  test("admin calling myMessages throws FORBIDDEN (not empty results)", async () => {
    const ctx = createMockCtx({
      user: ADMIN_USER,
      dbGet: { [CASE_ID]: CASE_BOTH_PC },
      dbQueries: { privateMessages: USER_A_PRIVATE_MESSAGES },
    });

    try {
      await myMessagesHandler(ctx, { caseId: CASE_ID });
      expect.unreachable("Expected FORBIDDEN error");
    } catch (err) {
      expect(err).toBeInstanceOf(ConvexError);
      const data = (err as ConvexError<{ code: string; httpStatus: number }>)
        .data;
      expect(data.code).toBe("FORBIDDEN");
      expect(data.httpStatus).toBe(403);
    }
  });

  test("admin calling joint chat messages throws FORBIDDEN", async () => {
    const ctx = createMockCtx({
      user: ADMIN_USER,
      dbGet: { [CASE_ID]: CASE_JOINT_ACTIVE },
      dbQueries: { partyStates: [] },
    });

    try {
      await jointMessagesHandler(ctx, { caseId: CASE_ID });
      expect.unreachable("Expected FORBIDDEN error");
    } catch (err) {
      expect(err).toBeInstanceOf(ConvexError);
      const data = (err as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("FORBIDDEN");
    }
  });

  test("admin calling cases.get throws FORBIDDEN for non-party case", async () => {
    const ctx = createMockCtx({
      user: ADMIN_USER,
      dbGet: { [CASE_ID]: CASE_BOTH_PC },
    });

    try {
      await getCaseHandler(ctx, { caseId: CASE_ID });
      expect.unreachable("Expected FORBIDDEN error");
    } catch (err) {
      expect(err).toBeInstanceOf(ConvexError);
      const data = (err as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("FORBIDDEN");
    }
  });

  test("admin calling cases.partyStates throws FORBIDDEN for non-party case", async () => {
    const ctx = createMockCtx({
      user: ADMIN_USER,
      dbGet: { [CASE_ID]: CASE_BOTH_PC },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    try {
      await partyStatesHandler(ctx, { caseId: CASE_ID });
      expect.unreachable("Expected FORBIDDEN error");
    } catch (err) {
      expect(err).toBeInstanceOf(ConvexError);
      const data = (err as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("FORBIDDEN");
    }
  });
});

describe("AC5: Admin privacy denials use FORBIDDEN, not silent failures", () => {
  test("admin access denial is ConvexError with code FORBIDDEN and httpStatus 403", async () => {
    const ctx = createMockCtx({
      user: ADMIN_USER,
      dbGet: { [CASE_ID]: CASE_BOTH_PC },
      dbQueries: { privateMessages: USER_A_PRIVATE_MESSAGES },
    });

    const promise = myMessagesHandler(ctx, { caseId: CASE_ID });
    await expect(promise).rejects.toThrow(ConvexError);
    // Ensure it's not a generic Error — it's a structured ConvexError
    await expect(promise).rejects.not.toThrow(
      "Cannot read properties of undefined",
    );
  });
});

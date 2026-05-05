/**
 * WOR-75 AC4: cases/partyStates query — other party's form fields are not exposed.
 *
 * Tests the cases.partyStates query handler to verify that:
 * - The caller's own party state is returned in full.
 * - The other party's response contains only phase-level booleans
 *   (hasCompletedPC, displayName), NOT private form fields
 *   (description, desiredOutcome, mainTopic, synthesisText).
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import { partyStates } from "../../convex/cases";
import {
  createMockCtx,
  getHandler,
  USER_A,
  USER_B,
  CASE_ID,
  CASE_BOTH_PC,
  PARTY_STATE_A,
  PARTY_STATE_B,
} from "./_helpers";

const handler = getHandler(partyStates);

describe("AC4: partyStates does not expose other party's form fields", () => {
  test("User A sees own full state but only phase-level info for User B", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: {
        [CASE_ID]: CASE_BOTH_PC,
        [USER_B._id]: { _id: USER_B._id, displayName: "Bob" },
      },
      dbQueries: {
        partyStates: [PARTY_STATE_A, PARTY_STATE_B],
      },
    });

    const result = await handler(ctx, { caseId: CASE_ID });

    // Caller's own state is returned in full
    expect(result.self).not.toBeNull();
    expect(result.self.userId).toBe(USER_A._id);

    // Other party's data is limited to phase-level only
    expect(result.otherPhaseOnly).not.toBeNull();
    expect(result.otherPhaseOnly).toHaveProperty("hasCompletedPC");
    expect(result.otherPhaseOnly).toHaveProperty("displayName");

    // Must NOT expose private form fields
    expect(result.otherPhaseOnly).not.toHaveProperty("description");
    expect(result.otherPhaseOnly).not.toHaveProperty("desiredOutcome");
    expect(result.otherPhaseOnly).not.toHaveProperty("mainTopic");
    expect(result.otherPhaseOnly).not.toHaveProperty("synthesisText");
  });

  test("User B sees own full state but only phase-level info for User A", async () => {
    const ctx = createMockCtx({
      user: USER_B,
      dbGet: {
        [CASE_ID]: CASE_BOTH_PC,
        [USER_A._id]: { _id: USER_A._id, displayName: "Alice" },
      },
      dbQueries: {
        partyStates: [PARTY_STATE_A, PARTY_STATE_B],
      },
    });

    const result = await handler(ctx, { caseId: CASE_ID });

    expect(result.self).not.toBeNull();
    expect(result.self.userId).toBe(USER_B._id);

    expect(result.otherPhaseOnly).not.toBeNull();
    expect(result.otherPhaseOnly).toHaveProperty("hasCompletedPC");

    // Must NOT expose User A's private form content
    expect(result.otherPhaseOnly).not.toHaveProperty("description");
    expect(result.otherPhaseOnly).not.toHaveProperty("desiredOutcome");
    expect(result.otherPhaseOnly).not.toHaveProperty("mainTopic");
    expect(result.otherPhaseOnly).not.toHaveProperty("synthesisText");
  });

  test("hasCompletedPC reflects the other party's actual completion status", async () => {
    const ctx = createMockCtx({
      user: USER_A,
      dbGet: {
        [CASE_ID]: CASE_BOTH_PC,
        [USER_B._id]: { _id: USER_B._id, displayName: "Bob" },
      },
      dbQueries: {
        partyStates: [PARTY_STATE_A, PARTY_STATE_B],
      },
    });

    const result = await handler(ctx, { caseId: CASE_ID });

    // User B's PARTY_STATE_B has privateCoachingCompletedAt set → true
    expect(result.otherPhaseOnly!.hasCompletedPC).toBe(true);
  });

  test("hasCompletedPC is false when other party has not completed", async () => {
    const incompletePartyB = {
      ...PARTY_STATE_B,
      privateCoachingCompletedAt: undefined,
    };

    const ctx = createMockCtx({
      user: USER_A,
      dbGet: {
        [CASE_ID]: CASE_BOTH_PC,
        [USER_B._id]: { _id: USER_B._id, displayName: "Bob" },
      },
      dbQueries: {
        partyStates: [PARTY_STATE_A, incompletePartyB],
      },
    });

    const result = await handler(ctx, { caseId: CASE_ID });

    expect(result.otherPhaseOnly!.hasCompletedPC).toBe(false);
  });

  test("non-party user gets FORBIDDEN when querying partyStates", async () => {
    const userC = {
      _id: "users:userC",
      email: "userC@test.com",
      role: "USER" as const,
      createdAt: 1002,
    };

    const ctx = createMockCtx({
      user: userC,
      dbGet: { [CASE_ID]: CASE_BOTH_PC },
      dbQueries: { partyStates: [PARTY_STATE_A, PARTY_STATE_B] },
    });

    try {
      await handler(ctx, { caseId: CASE_ID });
      expect.unreachable("Expected FORBIDDEN error");
    } catch (err) {
      expect(err).toBeInstanceOf(ConvexError);
      const data = (err as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("FORBIDDEN");
    }
  });
});

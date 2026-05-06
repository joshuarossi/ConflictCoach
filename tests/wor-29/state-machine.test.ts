/**
 * Unit tests for convex/lib/stateMachine.ts (WOR-29)
 *
 * These tests cover all 6 acceptance criteria for the case lifecycle
 * state machine helper. They will FAIL until the implementation exists.
 */
import { describe, test, expect } from "vitest";
import {
  CASE_STATUSES,
  type CaseStatus,
  VALID_TRANSITIONS,
  validateTransition,
  canEnterJointChat,
  canProposeClosure,
  canConfirmClosure,
} from "../../convex/lib/stateMachine";
import { ConvexError } from "convex/values";

// ---------------------------------------------------------------------------
// Test fixtures — minimal mock objects matching the data model shapes
// the state machine helpers accept as arguments.
// ---------------------------------------------------------------------------

/** Convex IDs are opaque strings in production; use branded strings for tests. */
const USER_A = "user_a_id" as any;
const USER_B = "user_b_id" as any;
const CASE_ID = "case_id" as any;
const TEMPLATE_VERSION_ID = "tv_id" as any;

function makeCase(
  overrides: Partial<{
    status: CaseStatus;
    isSolo: boolean;
    initiatorUserId: any;
    inviteeUserId: any;
  }> = {},
) {
  return {
    _id: CASE_ID,
    schemaVersion: 1 as const,
    status: "JOINT_ACTIVE" as CaseStatus,
    isSolo: false,
    category: "workplace",
    templateVersionId: TEMPLATE_VERSION_ID,
    initiatorUserId: USER_A,
    inviteeUserId: USER_B,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makePartyState(
  overrides: Partial<{
    userId: any;
    role: "INITIATOR" | "INVITEE";
    privateCoachingCompletedAt: number | undefined;
    closureProposed: boolean | undefined;
    closureConfirmed: boolean | undefined;
  }> = {},
) {
  return {
    caseId: CASE_ID,
    userId: USER_A,
    role: "INITIATOR" as const,
    privateCoachingCompletedAt: undefined as number | undefined,
    closureProposed: undefined as boolean | undefined,
    closureConfirmed: undefined as boolean | undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC 1: All 7 case statuses are defined as a union type
// ---------------------------------------------------------------------------
describe("AC1: All 7 case statuses are defined as a union type", () => {
  const expectedStatuses: string[] = [
    "DRAFT_PRIVATE_COACHING",
    "BOTH_PRIVATE_COACHING",
    "READY_FOR_JOINT",
    "JOINT_ACTIVE",
    "CLOSED_RESOLVED",
    "CLOSED_UNRESOLVED",
    "CLOSED_ABANDONED",
  ];

  test("CASE_STATUSES contains exactly the 7 required statuses", () => {
    expect(CASE_STATUSES).toBeDefined();
    expect([...CASE_STATUSES].sort()).toEqual([...expectedStatuses].sort());
    expect(CASE_STATUSES).toHaveLength(7);
  });

  test("CaseStatus type accepts all 7 statuses at runtime", () => {
    // Each status should be a member of the exported CASE_STATUSES array/set.
    for (const status of expectedStatuses) {
      expect(CASE_STATUSES).toContain(status);
    }
  });
});

// ---------------------------------------------------------------------------
// AC 2: All valid transitions are enumerated
// ---------------------------------------------------------------------------
describe("AC2: All valid transitions are enumerated", () => {
  const expectedValidTransitions: [string, string][] = [
    ["DRAFT_PRIVATE_COACHING", "BOTH_PRIVATE_COACHING"],
    ["BOTH_PRIVATE_COACHING", "READY_FOR_JOINT"],
    ["READY_FOR_JOINT", "JOINT_ACTIVE"],
    ["JOINT_ACTIVE", "CLOSED_RESOLVED"],
    ["JOINT_ACTIVE", "CLOSED_UNRESOLVED"],
    ["JOINT_ACTIVE", "CLOSED_ABANDONED"],
  ];

  test("VALID_TRANSITIONS includes all expected transition edges", () => {
    expect(VALID_TRANSITIONS).toBeDefined();
    for (const [from, to] of expectedValidTransitions) {
      // VALID_TRANSITIONS should be a map or similar structure that
      // contains these pairs. We verify via validateTransition not throwing.
      expect(() =>
        validateTransition(from as CaseStatus, to as CaseStatus),
      ).not.toThrow();
    }
  });

  test("validateTransition does not throw for each valid transition", () => {
    for (const [from, to] of expectedValidTransitions) {
      expect(() =>
        validateTransition(from as CaseStatus, to as CaseStatus),
      ).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// AC 3: validateTransition throws a CONFLICT error for any illegal transition
// ---------------------------------------------------------------------------
describe("AC3: validateTransition throws a CONFLICT error for illegal transitions", () => {
  const illegalTransitions: [string, string][] = [
    // Backward transitions
    ["BOTH_PRIVATE_COACHING", "DRAFT_PRIVATE_COACHING"],
    ["READY_FOR_JOINT", "BOTH_PRIVATE_COACHING"],
    ["JOINT_ACTIVE", "READY_FOR_JOINT"],
    ["CLOSED_RESOLVED", "JOINT_ACTIVE"],
    // Skipped states
    ["DRAFT_PRIVATE_COACHING", "READY_FOR_JOINT"],
    ["DRAFT_PRIVATE_COACHING", "JOINT_ACTIVE"],
    ["DRAFT_PRIVATE_COACHING", "CLOSED_RESOLVED"],
    ["BOTH_PRIVATE_COACHING", "JOINT_ACTIVE"],
    ["BOTH_PRIVATE_COACHING", "CLOSED_RESOLVED"],
    ["READY_FOR_JOINT", "CLOSED_RESOLVED"],
    // Transitions from closed states
    ["CLOSED_RESOLVED", "DRAFT_PRIVATE_COACHING"],
    ["CLOSED_UNRESOLVED", "JOINT_ACTIVE"],
    ["CLOSED_ABANDONED", "READY_FOR_JOINT"],
    // Self-transitions
    ["DRAFT_PRIVATE_COACHING", "DRAFT_PRIVATE_COACHING"],
    ["JOINT_ACTIVE", "JOINT_ACTIVE"],
  ];

  for (const [from, to] of illegalTransitions) {
    test(`${from} → ${to} throws a CONFLICT error`, () => {
      expect(() =>
        validateTransition(from as CaseStatus, to as CaseStatus),
      ).toThrow(ConvexError);

      try {
        validateTransition(from as CaseStatus, to as CaseStatus);
      } catch (e) {
        expect(e).toBeInstanceOf(ConvexError);
        const data = (e as ConvexError<{ code: string }>).data;
        expect(data.code).toBe("CONFLICT");
      }
    });
  }
});

// ---------------------------------------------------------------------------
// AC 4: Helper functions are exported: canEnterJointChat, canProposeClosure,
//        canConfirmClosure
// ---------------------------------------------------------------------------
describe("AC4: Helper functions are exported", () => {
  test("canEnterJointChat is a function", () => {
    expect(typeof canEnterJointChat).toBe("function");
  });

  test("canProposeClosure is a function", () => {
    expect(typeof canProposeClosure).toBe("function");
  });

  test("canConfirmClosure is a function", () => {
    expect(typeof canConfirmClosure).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// AC 5: Transition from BOTH_PRIVATE_COACHING → READY_FOR_JOINT requires
//        both parties' privateCoachingCompletedAt to be set in partyStates
// ---------------------------------------------------------------------------
describe("AC5: canEnterJointChat requires both parties privateCoachingCompletedAt set", () => {
  test("returns true when both parties have privateCoachingCompletedAt set", () => {
    const partyStates = [
      makePartyState({
        userId: USER_A,
        role: "INITIATOR",
        privateCoachingCompletedAt: Date.now(),
      }),
      makePartyState({
        userId: USER_B,
        role: "INVITEE",
        privateCoachingCompletedAt: Date.now(),
      }),
    ];
    expect(canEnterJointChat(partyStates)).toBe(true);
  });

  test("returns false when only initiator has privateCoachingCompletedAt set", () => {
    const partyStates = [
      makePartyState({
        userId: USER_A,
        role: "INITIATOR",
        privateCoachingCompletedAt: Date.now(),
      }),
      makePartyState({
        userId: USER_B,
        role: "INVITEE",
        privateCoachingCompletedAt: undefined,
      }),
    ];
    expect(canEnterJointChat(partyStates)).toBe(false);
  });

  test("returns false when only invitee has privateCoachingCompletedAt set", () => {
    const partyStates = [
      makePartyState({
        userId: USER_A,
        role: "INITIATOR",
        privateCoachingCompletedAt: undefined,
      }),
      makePartyState({
        userId: USER_B,
        role: "INVITEE",
        privateCoachingCompletedAt: Date.now(),
      }),
    ];
    expect(canEnterJointChat(partyStates)).toBe(false);
  });

  test("returns false when neither party has privateCoachingCompletedAt set", () => {
    const partyStates = [
      makePartyState({
        userId: USER_A,
        role: "INITIATOR",
        privateCoachingCompletedAt: undefined,
      }),
      makePartyState({
        userId: USER_B,
        role: "INVITEE",
        privateCoachingCompletedAt: undefined,
      }),
    ];
    expect(canEnterJointChat(partyStates)).toBe(false);
  });

  test("returns false when partyStates is empty", () => {
    expect(canEnterJointChat([])).toBe(false);
  });

  test("returns false when only one partyState exists", () => {
    const partyStates = [
      makePartyState({
        userId: USER_A,
        role: "INITIATOR",
        privateCoachingCompletedAt: Date.now(),
      }),
    ];
    expect(canEnterJointChat(partyStates)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC 6: Closure requires proposer and confirmer to be different parties
//        (or the same user in solo mode where case.isSolo === true)
// ---------------------------------------------------------------------------
describe("AC6: Closure requires different proposer/confirmer (relaxed in solo mode)", () => {
  describe("canProposeClosure", () => {
    test("returns true when user is a party and case is JOINT_ACTIVE", () => {
      const caseDoc = makeCase({ status: "JOINT_ACTIVE" });
      expect(canProposeClosure(caseDoc, USER_A)).toBe(true);
    });

    test("returns true when invitee proposes and case is JOINT_ACTIVE", () => {
      const caseDoc = makeCase({ status: "JOINT_ACTIVE" });
      expect(canProposeClosure(caseDoc, USER_B)).toBe(true);
    });

    test("returns false when user is not a party to the case", () => {
      const caseDoc = makeCase({ status: "JOINT_ACTIVE" });
      const unknownUser = "user_unknown";
      expect(canProposeClosure(caseDoc, unknownUser)).toBe(false);
    });

    test("returns false when case is not JOINT_ACTIVE", () => {
      const caseDoc = makeCase({ status: "BOTH_PRIVATE_COACHING" });
      expect(canProposeClosure(caseDoc, USER_A)).toBe(false);
    });
  });

  describe("canConfirmClosure", () => {
    test("returns true when confirmer is different from proposer (non-solo)", () => {
      const caseDoc = makeCase({ isSolo: false });
      // USER_A proposed, USER_B confirms
      expect(canConfirmClosure(caseDoc, USER_B, USER_A)).toBe(true);
    });

    test("returns false when confirmer is same as proposer (non-solo)", () => {
      const caseDoc = makeCase({ isSolo: false });
      // USER_A proposed and tries to confirm
      expect(canConfirmClosure(caseDoc, USER_A, USER_A)).toBe(false);
    });

    test("returns true when confirmer is same as proposer in solo mode", () => {
      const caseDoc = makeCase({ isSolo: true });
      // Same user can both propose and confirm in solo mode
      expect(canConfirmClosure(caseDoc, USER_A, USER_A)).toBe(true);
    });

    test("returns true when different users confirm in solo mode", () => {
      const caseDoc = makeCase({ isSolo: true });
      expect(canConfirmClosure(caseDoc, USER_B, USER_A)).toBe(true);
    });

    test("returns false when user is not a party to the case", () => {
      const caseDoc = makeCase({ status: "JOINT_ACTIVE" });
      const unknownUser = "user_unknown";
      expect(canConfirmClosure(caseDoc, unknownUser, USER_A)).toBe(false);
    });

    test("returns false when case is not JOINT_ACTIVE", () => {
      const caseDoc = makeCase({ status: "BOTH_PRIVATE_COACHING" });
      expect(canConfirmClosure(caseDoc, USER_B, USER_A)).toBe(false);
    });
  });
});

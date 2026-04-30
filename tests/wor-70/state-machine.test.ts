import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import {
  validateTransition,
  canEnterJointChat,
  canProposeClosure,
  canConfirmClosure,
  CASE_STATUSES,
  VALID_TRANSITIONS,
  type CaseStatus,
  type CaseDoc,
  type PartyState,
} from "../../convex/lib/stateMachine";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePartyState(overrides: Partial<PartyState> = {}): PartyState {
  return {
    userId: "user_alice",
    privateCoachingCompletedAt: null,
    closureProposed: null,
    closureConfirmed: null,
    ...overrides,
  };
}

function makeCaseDoc(overrides: Partial<CaseDoc> = {}): CaseDoc {
  return {
    status: "JOINT_ACTIVE",
    isSolo: false,
    initiatorUserId: "user_alice",
    inviteeUserId: "user_bob",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateTransition
// ---------------------------------------------------------------------------

describe("State machine tests: all valid transitions succeed, all invalid transitions throw CONFLICT", () => {
  describe("valid transitions succeed", () => {
    const validPairs: Array<[CaseStatus, CaseStatus]> = [
      ["DRAFT_PRIVATE_COACHING", "BOTH_PRIVATE_COACHING"],
      ["BOTH_PRIVATE_COACHING", "READY_FOR_JOINT"],
      ["READY_FOR_JOINT", "JOINT_ACTIVE"],
      ["JOINT_ACTIVE", "CLOSED_RESOLVED"],
      ["JOINT_ACTIVE", "CLOSED_UNRESOLVED"],
      ["JOINT_ACTIVE", "CLOSED_ABANDONED"],
    ];

    test.each(validPairs)(
      "%s → %s succeeds",
      (from, to) => {
        expect(() => validateTransition(from, to)).not.toThrow();
      },
    );

    test("all 7 valid transition edges are tested (6 edges from 4 source states)", () => {
      // Count all valid edges from the VALID_TRANSITIONS map
      let totalEdges = 0;
      for (const targets of Object.values(VALID_TRANSITIONS)) {
        totalEdges += targets.length;
      }
      // DRAFT->1, BOTH->1, READY->1, JOINT->3, terminal states->0 = 6 edges
      expect(totalEdges).toBe(6);
      expect(validPairs).toHaveLength(6);
    });
  });

  describe("all invalid transitions throw CONFLICT", () => {
    // Generate all invalid pairs
    const invalidPairs: Array<[CaseStatus, CaseStatus]> = [];
    for (const from of CASE_STATUSES) {
      for (const to of CASE_STATUSES) {
        const allowed = VALID_TRANSITIONS[from];
        if (!allowed.includes(to)) {
          invalidPairs.push([from, to]);
        }
      }
    }

    test.each(invalidPairs)(
      "%s → %s throws CONFLICT",
      (from, to) => {
        try {
          validateTransition(from, to);
          expect.unreachable("should throw");
        } catch (err) {
          expect(err).toBeInstanceOf(ConvexError);
          expect((err as ConvexError<{ code: string }>).data.code).toBe(
            "CONFLICT",
          );
        }
      },
    );
  });

  // -------------------------------------------------------------------------
  // canEnterJointChat
  // -------------------------------------------------------------------------

  describe("canEnterJointChat", () => {
    test("returns true when both parties have completed private coaching", () => {
      const states: PartyState[] = [
        makePartyState({ userId: "user_alice", privateCoachingCompletedAt: Date.now() }),
        makePartyState({ userId: "user_bob", privateCoachingCompletedAt: Date.now() }),
      ];
      expect(canEnterJointChat(states)).toBe(true);
    });

    test("returns false when only one party has completed", () => {
      const states: PartyState[] = [
        makePartyState({ userId: "user_alice", privateCoachingCompletedAt: Date.now() }),
        makePartyState({ userId: "user_bob", privateCoachingCompletedAt: null }),
      ];
      expect(canEnterJointChat(states)).toBe(false);
    });

    test("returns false when neither party has completed", () => {
      const states: PartyState[] = [
        makePartyState({ userId: "user_alice" }),
        makePartyState({ userId: "user_bob" }),
      ];
      expect(canEnterJointChat(states)).toBe(false);
    });

    test("returns false when fewer than 2 party states", () => {
      expect(canEnterJointChat([])).toBe(false);
      expect(
        canEnterJointChat([
          makePartyState({ privateCoachingCompletedAt: Date.now() }),
        ]),
      ).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // canProposeClosure
  // -------------------------------------------------------------------------

  describe("canProposeClosure", () => {
    test("returns true for initiator when JOINT_ACTIVE", () => {
      const doc = makeCaseDoc();
      expect(canProposeClosure(doc, "user_alice")).toBe(true);
    });

    test("returns true for invitee when JOINT_ACTIVE", () => {
      const doc = makeCaseDoc();
      expect(canProposeClosure(doc, "user_bob")).toBe(true);
    });

    test("returns false for non-party user", () => {
      const doc = makeCaseDoc();
      expect(canProposeClosure(doc, "user_stranger")).toBe(false);
    });

    test("returns false when case is not JOINT_ACTIVE", () => {
      const doc = makeCaseDoc({ status: "READY_FOR_JOINT" });
      expect(canProposeClosure(doc, "user_alice")).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // canConfirmClosure
  // -------------------------------------------------------------------------

  describe("canConfirmClosure", () => {
    test("returns true when confirmer is different party from proposer", () => {
      const doc = makeCaseDoc();
      expect(canConfirmClosure(doc, "user_bob", "user_alice")).toBe(true);
    });

    test("returns false when same user proposes and confirms in non-solo mode", () => {
      const doc = makeCaseDoc();
      expect(canConfirmClosure(doc, "user_alice", "user_alice")).toBe(false);
    });

    test("returns true when same user proposes and confirms in solo mode", () => {
      const doc = makeCaseDoc({ isSolo: true });
      expect(canConfirmClosure(doc, "user_alice", "user_alice")).toBe(true);
    });

    test("returns false for non-party user", () => {
      const doc = makeCaseDoc();
      expect(canConfirmClosure(doc, "user_stranger", "user_alice")).toBe(false);
    });

    test("returns false when case is not JOINT_ACTIVE", () => {
      const doc = makeCaseDoc({ status: "CLOSED_RESOLVED" });
      expect(canConfirmClosure(doc, "user_bob", "user_alice")).toBe(false);
    });
  });
});

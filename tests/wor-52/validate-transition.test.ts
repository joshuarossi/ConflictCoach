/**
 * WOR-52: validateTransition integration tests for closure mutations
 *
 * Covers:
 * - AC7: State machine validateTransition is called for all status changes.
 *        Tests valid and invalid transitions via the pure state machine functions.
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import {
  validateTransition,
  canProposeClosure,
  canConfirmClosure,
} from "../../convex/lib/stateMachine";

// ---------------------------------------------------------------------------
// AC7: validateTransition allows valid closure transitions
// ---------------------------------------------------------------------------
describe("AC7: validateTransition permits valid closure transitions", () => {
  test("JOINT_ACTIVE -> CLOSED_RESOLVED is valid", () => {
    expect(() =>
      validateTransition("JOINT_ACTIVE", "CLOSED_RESOLVED"),
    ).not.toThrow();
  });

  test("JOINT_ACTIVE -> CLOSED_UNRESOLVED is valid", () => {
    expect(() =>
      validateTransition("JOINT_ACTIVE", "CLOSED_UNRESOLVED"),
    ).not.toThrow();
  });

  test("JOINT_ACTIVE -> CLOSED_ABANDONED is valid", () => {
    expect(() =>
      validateTransition("JOINT_ACTIVE", "CLOSED_ABANDONED"),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC7: validateTransition rejects invalid closure transitions
// ---------------------------------------------------------------------------
describe("AC7: validateTransition rejects invalid transitions", () => {
  test("CLOSED_RESOLVED -> any transition throws CONFLICT", () => {
    const targets = [
      "DRAFT_PRIVATE_COACHING",
      "BOTH_PRIVATE_COACHING",
      "READY_FOR_JOINT",
      "JOINT_ACTIVE",
      "CLOSED_UNRESOLVED",
      "CLOSED_ABANDONED",
    ] as const;
    for (const target of targets) {
      expect(() => validateTransition("CLOSED_RESOLVED", target)).toThrow(
        ConvexError,
      );
    }
  });

  test("CLOSED_UNRESOLVED -> any transition throws CONFLICT", () => {
    const targets = [
      "DRAFT_PRIVATE_COACHING",
      "BOTH_PRIVATE_COACHING",
      "READY_FOR_JOINT",
      "JOINT_ACTIVE",
      "CLOSED_RESOLVED",
      "CLOSED_ABANDONED",
    ] as const;
    for (const target of targets) {
      expect(() => validateTransition("CLOSED_UNRESOLVED", target)).toThrow(
        ConvexError,
      );
    }
  });

  test("DRAFT_PRIVATE_COACHING -> CLOSED_RESOLVED throws CONFLICT", () => {
    expect(() =>
      validateTransition("DRAFT_PRIVATE_COACHING", "CLOSED_RESOLVED"),
    ).toThrow(ConvexError);
  });

  test("READY_FOR_JOINT -> CLOSED_RESOLVED throws CONFLICT", () => {
    expect(() =>
      validateTransition("READY_FOR_JOINT", "CLOSED_RESOLVED"),
    ).toThrow(ConvexError);
  });
});

// ---------------------------------------------------------------------------
// AC7: canProposeClosure and canConfirmClosure guards
// ---------------------------------------------------------------------------
describe("AC7: canProposeClosure guard", () => {
  const caseDoc = {
    status: "JOINT_ACTIVE" as const,
    isSolo: false,
    initiatorUserId: "users:a",
    inviteeUserId: "users:b",
  };

  test("returns true for initiator on JOINT_ACTIVE case", () => {
    expect(canProposeClosure(caseDoc, "users:a")).toBe(true);
  });

  test("returns true for invitee on JOINT_ACTIVE case", () => {
    expect(canProposeClosure(caseDoc, "users:b")).toBe(true);
  });

  test("returns false for non-party user", () => {
    expect(canProposeClosure(caseDoc, "users:stranger")).toBe(false);
  });

  test("returns false when case is not JOINT_ACTIVE", () => {
    expect(
      canProposeClosure({ ...caseDoc, status: "CLOSED_RESOLVED" }, "users:a"),
    ).toBe(false);
  });
});

describe("AC7: canConfirmClosure guard", () => {
  const caseDoc = {
    status: "JOINT_ACTIVE" as const,
    isSolo: false,
    initiatorUserId: "users:a",
    inviteeUserId: "users:b",
  };

  test("returns true when confirmer differs from proposer", () => {
    expect(canConfirmClosure(caseDoc, "users:b", "users:a")).toBe(true);
  });

  test("returns false when confirmer is same as proposer (non-solo)", () => {
    expect(canConfirmClosure(caseDoc, "users:a", "users:a")).toBe(false);
  });

  test("returns true in solo mode even when same user", () => {
    const soloCase = { ...caseDoc, isSolo: true };
    expect(canConfirmClosure(soloCase, "users:a", "users:a")).toBe(true);
  });

  test("returns false for non-party user", () => {
    expect(canConfirmClosure(caseDoc, "users:stranger", "users:a")).toBe(false);
  });

  test("returns false when case is not JOINT_ACTIVE", () => {
    expect(
      canConfirmClosure(
        { ...caseDoc, status: "CLOSED_UNRESOLVED" },
        "users:b",
        "users:a",
      ),
    ).toBe(false);
  });
});

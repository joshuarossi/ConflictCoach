import { throwAppError } from "./errors";

// All 7 case lifecycle statuses (TechSpec §5.1)
export type CaseStatus =
  | "DRAFT_PRIVATE_COACHING"
  | "BOTH_PRIVATE_COACHING"
  | "READY_FOR_JOINT"
  | "JOINT_ACTIVE"
  | "CLOSED_RESOLVED"
  | "CLOSED_UNRESOLVED"
  | "CLOSED_ABANDONED";

export const CASE_STATUSES: readonly CaseStatus[] = [
  "DRAFT_PRIVATE_COACHING",
  "BOTH_PRIVATE_COACHING",
  "READY_FOR_JOINT",
  "JOINT_ACTIVE",
  "CLOSED_RESOLVED",
  "CLOSED_UNRESOLVED",
  "CLOSED_ABANDONED",
] as const;

// Valid transitions per TechSpec §5.1 state diagram
export const VALID_TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  DRAFT_PRIVATE_COACHING: ["BOTH_PRIVATE_COACHING", "CLOSED_ABANDONED"],
  BOTH_PRIVATE_COACHING: ["READY_FOR_JOINT"],
  READY_FOR_JOINT: ["JOINT_ACTIVE"],
  JOINT_ACTIVE: ["CLOSED_RESOLVED", "CLOSED_UNRESOLVED", "CLOSED_ABANDONED"],
  CLOSED_RESOLVED: [],
  CLOSED_UNRESOLVED: [],
  CLOSED_ABANDONED: [],
};

/**
 * Validates that a status transition is legal. Throws CONFLICT if not.
 */
export function validateTransition(
  currentStatus: CaseStatus,
  targetStatus: CaseStatus,
): void {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed.includes(targetStatus)) {
    throwAppError(
      "CONFLICT",
      `Invalid status transition: ${currentStatus} → ${targetStatus}`,
    );
  }
}

// Minimal types for helper function arguments (pure — no Convex runtime deps)
export interface PartyState {
  userId: string;
  privateCoachingCompletedAt?: number | null;
  closureProposed?: boolean | null;
  closureConfirmed?: boolean | null;
}

export interface CaseDoc {
  status: CaseStatus;
  isSolo: boolean;
  initiatorUserId: string;
  inviteeUserId?: string | null;
  partyStates?: PartyState[];
}

/**
 * Can the case transition to JOINT_ACTIVE?
 * Requires status READY_FOR_JOINT (implicit via validateTransition)
 * and both parties to have completed private coaching.
 */
export function canEnterJointChat(partyStates: PartyState[]): boolean {
  if (partyStates.length < 2) return false;
  return partyStates.every((ps) => ps.privateCoachingCompletedAt != null);
}

/**
 * Can the given user propose closure on this case?
 * Requires: case is JOINT_ACTIVE and user is a party.
 */
export function canProposeClosure(caseDoc: CaseDoc, userId: string): boolean {
  if (caseDoc.status !== "JOINT_ACTIVE") return false;
  return (
    caseDoc.initiatorUserId === userId || caseDoc.inviteeUserId === userId
  );
}

/**
 * Can the given user confirm closure on this case?
 * Requires: case is JOINT_ACTIVE, user is a party, and user is different
 * from the proposer — unless solo mode, where same user can both propose
 * and confirm.
 */
export function canConfirmClosure(
  caseDoc: CaseDoc,
  userId: string,
  proposerUserId: string,
): boolean {
  if (caseDoc.status !== "JOINT_ACTIVE") return false;

  const isParty =
    caseDoc.initiatorUserId === userId || caseDoc.inviteeUserId === userId;
  if (!isParty) return false;

  // In solo mode, same user can confirm their own proposal
  if (caseDoc.isSolo) return true;

  // Otherwise, confirmer must be a different party from the proposer
  return proposerUserId !== userId;
}

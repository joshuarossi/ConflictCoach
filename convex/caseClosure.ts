/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { throwAppError } from "./lib/errors";
import { requireAuth } from "./lib/auth";
import { validateTransition } from "./lib/stateMachine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify caller is a party to the case via partyStates lookup.
 * Returns the case document and caller's partyState row.
 */
async function requireCaseParty(
  ctx: { db: any },
  caseId: string,
  userId: string,
): Promise<{ caseDoc: any; partyState: any }> {
  const caseDoc = await ctx.db.get(caseId);
  if (!caseDoc) {
    throwAppError("NOT_FOUND", "Case not found");
  }

  const partyState = await ctx.db
    .query("partyStates")
    .withIndex("by_case_and_user", (q: any) =>
      q.eq("caseId", caseId).eq("userId", userId),
    )
    .first();

  if (!partyState) {
    throwAppError("FORBIDDEN", "You are not a party to this case");
  }

  return { caseDoc, partyState };
}

/**
 * Ensure the case is in JOINT_ACTIVE status; throw CONFLICT otherwise.
 */
function requireJointActive(caseDoc: any): void {
  if (caseDoc.status !== "JOINT_ACTIVE") {
    throwAppError(
      "CONFLICT",
      `Operation requires JOINT_ACTIVE status, but case is ${caseDoc.status}`,
    );
  }
}

// ---------------------------------------------------------------------------
// proposeClosure — caller proposes to close the case (resolved path step 1)
// ---------------------------------------------------------------------------

export const proposeClosure = mutation({
  args: {
    caseId: v.id("cases"),
    closureSummary: v.optional(v.string()),
  },
  handler: async (
    ctx: any,
    args: { caseId: string; closureSummary?: string },
  ) => {
    const user = await requireAuth(ctx);
    const { caseDoc, partyState } = await requireCaseParty(
      ctx,
      args.caseId,
      user._id,
    );

    requireJointActive(caseDoc);

    // Set closureProposed on the caller's partyState
    await ctx.db.patch(partyState._id, { closureProposed: true });

    // Store closureSummary on the case if provided
    if (args.closureSummary !== undefined) {
      await ctx.db.patch(args.caseId, {
        closureSummary: args.closureSummary,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.caseId, { updatedAt: Date.now() });
    }
  },
});

// ---------------------------------------------------------------------------
// confirmClosure — other party confirms the proposal → CLOSED_RESOLVED
// ---------------------------------------------------------------------------

export const confirmClosure = mutation({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    const { caseDoc, partyState } = await requireCaseParty(
      ctx,
      args.caseId,
      user._id,
    );

    requireJointActive(caseDoc);

    // Find all party states for this case
    const allPartyStates = await ctx.db
      .query("partyStates")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    // Find the proposer (a party state with closureProposed=true)
    const proposer = allPartyStates.find(
      (ps: any) => ps.closureProposed === true,
    );

    if (!proposer) {
      throwAppError("CONFLICT", "No closure has been proposed");
    }

    // In non-solo mode, confirmer must be a different party from the proposer
    if (!caseDoc.isSolo && proposer.userId === user._id) {
      throwAppError(
        "CONFLICT",
        "Cannot confirm your own closure proposal",
      );
    }

    // Validate state machine transition
    validateTransition(caseDoc.status, "CLOSED_RESOLVED");

    // Atomically: set closureConfirmed, update case status, set closedAt
    const now = Date.now();
    await ctx.db.patch(partyState._id, { closureConfirmed: true });
    await ctx.db.patch(args.caseId, {
      status: "CLOSED_RESOLVED",
      closedAt: now,
      updatedAt: now,
    });
  },
});

// ---------------------------------------------------------------------------
// unilateralClose — immediate close → CLOSED_UNRESOLVED
// ---------------------------------------------------------------------------

export const unilateralClose = mutation({
  args: {
    caseId: v.id("cases"),
    reason: v.optional(v.string()),
  },
  handler: async (
    ctx: any,
    args: { caseId: string; reason?: string },
  ) => {
    const user = await requireAuth(ctx);
    const { caseDoc } = await requireCaseParty(ctx, args.caseId, user._id);

    requireJointActive(caseDoc);

    // Validate state machine transition
    validateTransition(caseDoc.status, "CLOSED_UNRESOLVED");

    const now = Date.now();
    await ctx.db.patch(args.caseId, {
      status: "CLOSED_UNRESOLVED",
      closedAt: now,
      closureSummary: args.reason,
      updatedAt: now,
    });
  },
});

// ---------------------------------------------------------------------------
// rejectClosure — clear the proposer's closureProposed flag
// ---------------------------------------------------------------------------

export const rejectClosure = mutation({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    const { caseDoc } = await requireCaseParty(ctx, args.caseId, user._id);

    requireJointActive(caseDoc);

    // Find all party states for this case
    const allPartyStates = await ctx.db
      .query("partyStates")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    // Find the proposer
    const proposer = allPartyStates.find(
      (ps: any) => ps.closureProposed === true,
    );

    if (!proposer) {
      throwAppError("CONFLICT", "No closure proposal to reject");
    }

    // Clear the closureProposed flag
    await ctx.db.patch(proposer._id, { closureProposed: false });
    await ctx.db.patch(args.caseId, { updatedAt: Date.now() });
  },
});

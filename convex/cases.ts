/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, getUserByEmail } from "./lib/auth";
import { throwAppError } from "./lib/errors";
import { DEFAULT_AI_USAGE } from "./lib/costBudget";

// ---------------------------------------------------------------------------
// list — return all cases where the authenticated user is a party
// ---------------------------------------------------------------------------

export const list = query({
  args: {},
  handler: async (ctx: any) => {
    const user = await requireAuth(ctx);

    // Query both indexes to find cases where user is initiator or invitee
    const asInitiator = await ctx.db
      .query("cases")
      .withIndex("by_initiator", (q: any) =>
        q.eq("initiatorUserId", user._id),
      )
      .collect();

    const asInvitee = await ctx.db
      .query("cases")
      .withIndex("by_invitee", (q: any) =>
        q.eq("inviteeUserId", user._id),
      )
      .collect();

    // Merge and deduplicate (user could theoretically appear in both)
    const caseMap = new Map<string, any>();
    for (const c of asInitiator) {
      caseMap.set(c._id.toString(), c);
    }
    for (const c of asInvitee) {
      caseMap.set(c._id.toString(), c);
    }

    const allCases = Array.from(caseMap.values());

    // Sort by updatedAt descending
    allCases.sort((a: any, b: any) => b.updatedAt - a.updatedAt);

    // Build response for each case
    const results = await Promise.all(
      allCases.map(async (caseDoc: any) => {
        // Determine the other party's userId
        const otherUserId =
          caseDoc.initiatorUserId === user._id
            ? caseDoc.inviteeUserId
            : caseDoc.initiatorUserId;

        // Look up other party's display name
        let displayName = "";
        if (otherUserId) {
          const otherUser = await ctx.db.get(otherUserId);
          displayName = otherUser?.displayName ?? "";
        }

        // Look up other party's phase-level status via partyStates
        let hasCompletedPC = false;
        if (otherUserId) {
          const otherPartyState = await ctx.db
            .query("partyStates")
            .withIndex("by_case_and_user", (q: any) =>
              q.eq("caseId", caseDoc._id).eq("userId", otherUserId),
            )
            .first();
          if (otherPartyState) {
            hasCompletedPC =
              otherPartyState.privateCoachingCompletedAt != null;
          }
        }

        return {
          id: caseDoc._id,
          status: caseDoc.status,
          category: caseDoc.category,
          createdAt: caseDoc.createdAt,
          updatedAt: caseDoc.updatedAt,
          isSolo: caseDoc.isSolo,
          displayName,
          hasCompletedPC,
        };
      }),
    );

    return results;
  },
});

// ---------------------------------------------------------------------------
// get — fetch a single case by ID (party-gated)
// ---------------------------------------------------------------------------

export const get = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc) return null;

    const isParty =
      caseDoc.initiatorUserId === user._id ||
      caseDoc.inviteeUserId === user._id;
    if (!isParty) {
      throwAppError("FORBIDDEN", "You are not a party to this case");
    }

    // Resolve the other party's display name for CaseDetail and TopNav
    const otherUserId =
      caseDoc.initiatorUserId === user._id
        ? caseDoc.inviteeUserId
        : caseDoc.initiatorUserId;

    let otherPartyName = "";
    if (otherUserId) {
      const otherUser = await ctx.db.get(otherUserId);
      otherPartyName = otherUser?.displayName ?? "";
    }

    return { ...caseDoc, otherPartyName };
  },
});

// ---------------------------------------------------------------------------
// partyStates — returns the caller's party state + limited info about the
// other party (display name, phase status), never private content
// ---------------------------------------------------------------------------

export const partyStates = query({
  args: { caseId: v.id("cases") },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc) {
      throwAppError("NOT_FOUND", "Case not found");
    }

    const isParty =
      caseDoc.initiatorUserId === user._id ||
      caseDoc.inviteeUserId === user._id;
    if (!isParty) {
      throwAppError("FORBIDDEN", "You are not a party to this case");
    }

    const allStates = await ctx.db
      .query("partyStates")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    const self = allStates.find(
      (ps: { userId: string }) => ps.userId === user._id,
    );
    const other = allStates.find(
      (ps: { userId: string }) => ps.userId !== user._id,
    );

    // Resolve the other party's display name from users table
    let otherPartyName = "the other party";
    if (other) {
      const otherUser = await ctx.db.get(other.userId);
      if (otherUser?.displayName) {
        otherPartyName = otherUser.displayName;
      }
    }

    return {
      self: self ?? null,
      otherPartyName,
      otherPhaseOnly: other
        ? {
            hasCompletedPC: other.privateCoachingCompletedAt != null,
            displayName: otherPartyName,
          }
        : null,
      // Expose all party states with roles for solo mode's useActingPartyUserId hook
      all: allStates.map((ps: { userId: string; role: string }) => ({
        userId: ps.userId,
        role: ps.role,
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// getCaseCost — return AI cost data for a case (party or admin)
//
// Exported as a plain async function so it can be called directly, and also
// registered as a Convex query (getCaseCostQuery) for client use.
// Uses lightweight identity-based auth (not requireAuth) because Convex Auth
// identities use subject-based lookup and may lack email.
// ---------------------------------------------------------------------------

export async function getCaseCost(
  ctx: any,
  args: { caseId: string },
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throwAppError("UNAUTHENTICATED", "Authentication required");
  }

  const caseDoc = await ctx.db.get(args.caseId);
  if (!caseDoc) {
    throwAppError("NOT_FOUND", "Case not found");
  }

  // Admin check: look up user record to check role
  // Convex Auth subject format is "userId|sessionId"
  const subject = identity.subject ?? "";
  const userIdFromSubject = subject.split("|")[0] || "";

  let user: any = null;
  if (userIdFromSubject) {
    try {
      user = await ctx.db.get(userIdFromSubject);
    } catch {
      user = null;
    }
  }
  if (!user && identity.email) {
    user = await getUserByEmail(ctx, identity.email);
  }

  const userIsAdmin = user?.role === "ADMIN";

  // Party check using string comparison of IDs
  const isParty =
    (user && (String(caseDoc.initiatorUserId) === String(user._id) ||
      String(caseDoc.inviteeUserId) === String(user._id))) ||
    userIdFromSubject === String(caseDoc.initiatorUserId) ||
    userIdFromSubject === String(caseDoc.inviteeUserId);

  if (!isParty && !userIsAdmin) {
    throwAppError("FORBIDDEN", "Not authorized to view this case's cost");
  }

  const usage = caseDoc.aiUsage ?? DEFAULT_AI_USAGE;
  return {
    totalInputTokens: usage.totalInputTokens,
    totalOutputTokens: usage.totalOutputTokens,
    totalCostUsd: usage.totalCostUsd,
    totalCost: usage.totalCostUsd,
    softCapReachedAt: usage.softCapReachedAt ?? null,
  };
}

// Convex query registration for client-side use
export const getCaseCostQuery = query({
  args: { caseId: v.id("cases") },
  handler: getCaseCost,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { throwAppError } from "./lib/errors";

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

    return caseDoc;
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
    };
  },
});

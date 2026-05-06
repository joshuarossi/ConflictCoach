/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../lib/auth";
import { throwAppError } from "../lib/errors";

/**
 * Decline an invite — marks the case as CLOSED_ABANDONED.
 * The invitee has chosen not to participate.
 */
export const decline = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx: any, args: { token: string }) => {
    await requireAuth(ctx);

    const tokenDoc = await ctx.db
      .query("inviteTokens")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();

    if (!tokenDoc) {
      throwAppError("TOKEN_INVALID", "Invite token not found or invalid");
    }

    if (tokenDoc.status !== "ACTIVE") {
      throwAppError("TOKEN_INVALID", "Invite token has already been used or revoked");
    }

    const caseDoc = await ctx.db.get(tokenDoc.caseId);
    if (!caseDoc) {
      throwAppError("NOT_FOUND", "Case not found");
    }

    const now = Date.now();

    // Close the case as abandoned
    await ctx.db.patch(caseDoc._id, {
      status: "CLOSED_ABANDONED",
      closedAt: now,
      closureSummary: "Invitee declined the invitation",
      updatedAt: now,
    });

    // Revoke the token
    await ctx.db.patch(tokenDoc._id, {
      status: "REVOKED" as const,
      consumedAt: now,
    });
  },
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../lib/auth";
import { throwAppError } from "../lib/errors";
import { validateTransition } from "../lib/stateMachine";

/** Redeem an invite token, binding the authenticated user to the case as invitee. */
export const redeem = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx: any, args) => {
    const user = await requireAuth(ctx);

    // --- Look up token by index ---
    const tokenDoc = await ctx.db
      .query("inviteTokens")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();

    if (!tokenDoc) {
      throwAppError("TOKEN_INVALID", "Invite token not found or invalid");
    }

    // --- Validate token is ACTIVE ---
    if (tokenDoc.status !== "ACTIVE") {
      throwAppError(
        "TOKEN_INVALID",
        "Invite token has already been used or revoked",
      );
    }

    // --- Load the case ---
    const caseDoc = await ctx.db.get(tokenDoc.caseId);
    if (!caseDoc) {
      throwAppError("NOT_FOUND", "Case not found");
    }

    // --- Prevent self-invite ---
    if (caseDoc.initiatorUserId === user._id) {
      throwAppError(
        "CONFLICT",
        "You cannot redeem an invite for your own case",
      );
    }

    // --- Validate case status transition ---
    validateTransition(caseDoc.status, "BOTH_PRIVATE_COACHING");

    const now = Date.now();

    // --- Atomic writes ---
    // 1. Set inviteeUserId on case and transition status
    await ctx.db.patch(caseDoc._id, {
      inviteeUserId: user._id,
      status: "BOTH_PRIVATE_COACHING",
      updatedAt: now,
    });

    // 2. Create partyStates row for invitee (no form fields yet)
    await ctx.db.insert("partyStates", {
      caseId: caseDoc._id,
      userId: user._id,
      role: "INVITEE" as const,
    });

    // 3. Consume the token
    await ctx.db.patch(tokenDoc._id, {
      status: "CONSUMED" as const,
      consumedAt: now,
      consumedByUserId: user._id,
    });

    return { caseId: caseDoc._id };
  },
});

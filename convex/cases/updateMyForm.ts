/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../lib/auth";
import { throwAppError } from "../lib/errors";

/** Update the caller's partyStates form fields for an existing case. */
export const updateMyForm = mutation({
  args: {
    caseId: v.id("cases"),
    mainTopic: v.string(),
    description: v.optional(v.string()),
    desiredOutcome: v.optional(v.string()),
  },
  handler: async (ctx: any, args) => {
    const user = await requireAuth(ctx);

    // --- Input validation ---
    if (!args.mainTopic || args.mainTopic.trim() === "") {
      throwAppError("INVALID_INPUT", "mainTopic is required");
    }

    // --- Look up the caller's partyStates row ---
    const partyState = await ctx.db
      .query("partyStates")
      .withIndex("by_case_and_user", (q: any) =>
        q.eq("caseId", args.caseId).eq("userId", user._id),
      )
      .first();

    if (!partyState) {
      throwAppError("FORBIDDEN", "You are not a party to this case");
    }

    // --- Check form lock ---
    if (partyState.privateCoachingCompletedAt != null) {
      throwAppError(
        "FORBIDDEN",
        "Form is locked after private coaching completion",
      );
    }

    // --- Patch the partyStates row ---
    await ctx.db.patch(partyState._id, {
      mainTopic: args.mainTopic.trim(),
      description: args.description ?? undefined,
      desiredOutcome: args.desiredOutcome ?? undefined,
      formCompletedAt: Date.now(),
    });
  },
});

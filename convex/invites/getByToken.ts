/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "../_generated/server";
import { v } from "convex/values";

/**
 * Public query to fetch invite metadata by token.
 * Does NOT require authentication — the logged-out invite page needs this.
 * Returns only safe-to-share fields: initiator display name, mainTopic,
 * category, and token status. Never exposes description, desiredOutcome,
 * or any private coaching content.
 */
export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx: any, args: { token: string }) => {
    const tokenDoc = await ctx.db
      .query("inviteTokens")
      .withIndex("by_token", (q: any) => q.eq("token", args.token))
      .first();

    if (!tokenDoc) {
      return { status: "INVALID" as const };
    }

    if (tokenDoc.status !== "ACTIVE") {
      return { status: "CONSUMED" as const };
    }

    // Load case
    const caseDoc = await ctx.db.get(tokenDoc.caseId);
    if (!caseDoc) {
      return { status: "INVALID" as const };
    }

    // Load initiator user for display name
    const initiatorUser = await ctx.db.get(caseDoc.initiatorUserId);
    const initiatorName = initiatorUser?.displayName || "Someone";

    // Load initiator's partyState to get mainTopic
    const initiatorPartyState = await ctx.db
      .query("partyStates")
      .withIndex("by_case_and_user", (q: any) =>
        q.eq("caseId", caseDoc._id).eq("userId", caseDoc.initiatorUserId),
      )
      .first();

    return {
      status: "ACTIVE" as const,
      initiatorName,
      mainTopic: initiatorPartyState?.mainTopic ?? null,
      category: caseDoc.category,
    };
  },
});

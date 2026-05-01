/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { throwAppError } from "./lib/errors";
import { requireAuth } from "./lib/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Statuses that allow reading joint messages (active + all closed). */
const READABLE_STATUSES = [
  "JOINT_ACTIVE",
  "CLOSED_RESOLVED",
  "CLOSED_UNRESOLVED",
  "CLOSED_ABANDONED",
] as const;

/**
 * Verify caller is a party to the case via partyStates lookup.
 * Returns the case document. Throws NOT_FOUND / FORBIDDEN as appropriate.
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

  // Authorise via partyStates table
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

// ---------------------------------------------------------------------------
// messages — reactive query returning all joint messages for a case
// ---------------------------------------------------------------------------

export const messages = query({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    const { caseDoc } = await requireCaseParty(ctx, args.caseId, user._id);

    // State validation: only JOINT_ACTIVE or CLOSED_* statuses are readable
    if (!(READABLE_STATUSES as readonly string[]).includes(caseDoc.status)) {
      throwAppError(
        "CONFLICT",
        `Cannot read joint messages in status ${caseDoc.status}`,
      );
    }

    const msgs = await ctx.db
      .query("jointMessages")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    return msgs.sort(
      (a: { createdAt: number }, b: { createdAt: number }) =>
        a.createdAt - b.createdAt,
    );
  },
});

// ---------------------------------------------------------------------------
// sendUserMessage — insert a USER message and schedule Coach AI response
// ---------------------------------------------------------------------------

export const sendUserMessage = mutation({
  args: {
    caseId: v.id("cases"),
    content: v.string(),
  },
  handler: async (ctx: any, args: { caseId: string; content: string }) => {
    const user = await requireAuth(ctx);
    const { caseDoc } = await requireCaseParty(ctx, args.caseId, user._id);

    // State validation: only allow sending during JOINT_ACTIVE
    if (caseDoc.status !== "JOINT_ACTIVE") {
      throwAppError(
        "CONFLICT",
        `Cannot send joint messages in status ${caseDoc.status}`,
      );
    }

    // Insert the user's message
    const messageId = await ctx.db.insert("jointMessages", {
      caseId: args.caseId,
      authorType: "USER" as const,
      authorUserId: user._id,
      content: args.content,
      status: "COMPLETE" as const,
      createdAt: Date.now(),
    });

    // Schedule Coach AI response generation (defensive — action ref may be
    // unavailable if the handler module hasn't been deployed yet)
    const generateRef = (internal as any)?.jointChat?.generateCoachResponse;
    if (generateRef) {
      try {
        await ctx.scheduler.runAfter(0, generateRef, {
          caseId: args.caseId,
          messageId,
        });
      } catch (err) {
        console.error("Failed to schedule coach response:", err);
        await ctx.db.insert("jointMessages", {
          caseId: args.caseId,
          authorType: "COACH" as const,
          content:
            "Sorry, I was unable to process your message. Please try again.",
          status: "ERROR" as const,
          createdAt: Date.now(),
        });
      }
    } else {
      console.warn(
        "generateCoachResponse action not found — not yet deployed",
      );
    }

    return messageId;
  },
});

// ---------------------------------------------------------------------------
// mySynthesis — reactive query returning caller's synthesis text
// ---------------------------------------------------------------------------

export const mySynthesis = query({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    const { partyState } = await requireCaseParty(ctx, args.caseId, user._id);

    return {
      synthesisText: partyState.synthesisText ?? null,
    };
  },
});

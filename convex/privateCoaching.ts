/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation, action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { throwAppError } from "./lib/errors";
import { requireAuth } from "./lib/auth";
import { assemblePrompt } from "./lib/prompts";
import { streamAIResponse } from "./lib/streaming";
import type { Message } from "./lib/prompts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify that the authenticated user is a party (initiator or invitee) on the
 * given case. Returns the case document. Throws FORBIDDEN if not a party,
 * NOT_FOUND if case doesn't exist.
 */
async function requireParty(
  ctx: { db: { get: (id: string) => Promise<any> } },
  caseId: string,
  userId: string,
): Promise<any> {
  const caseDoc = await ctx.db.get(caseId);
  if (!caseDoc) {
    throwAppError("NOT_FOUND", "Case not found");
  }

  const isParty =
    caseDoc.initiatorUserId === userId || caseDoc.inviteeUserId === userId;
  if (!isParty) {
    throwAppError("FORBIDDEN", "You are not a party to this case");
  }

  return caseDoc;
}

// ---------------------------------------------------------------------------
// myMessages — reactive query returning only the caller's private messages
// ---------------------------------------------------------------------------

export const myMessages = query({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    await requireParty(ctx, args.caseId, user._id);

    const messages = await ctx.db
      .query("privateMessages")
      .withIndex("by_case_and_user", (q: any) =>
        q.eq("caseId", args.caseId).eq("userId", user._id),
      )
      .collect();

    // Privacy enforcement: always filter by userId to guarantee isolation,
    // even if the index already scoped the results.
    return messages.filter(
      (m: { userId: string }) => m.userId === user._id,
    );
  },
});

// ---------------------------------------------------------------------------
// sendUserMessage — insert a USER message and schedule AI response
// ---------------------------------------------------------------------------

const ALLOWED_SEND_STATUSES = [
  "DRAFT_PRIVATE_COACHING",
  "BOTH_PRIVATE_COACHING",
] as const;

export const sendUserMessage = mutation({
  args: {
    caseId: v.id("cases"),
    content: v.string(),
  },
  handler: async (ctx: any, args: { caseId: string; content: string }) => {
    const user = await requireAuth(ctx);
    const caseDoc = await requireParty(ctx, args.caseId, user._id);

    // State validation: only allow sending during private coaching phases
    if (
      !(ALLOWED_SEND_STATUSES as readonly string[]).includes(caseDoc.status)
    ) {
      throwAppError(
        "CONFLICT",
        `Cannot send private messages in status ${caseDoc.status}`,
      );
    }

    // Insert the user's message
    const messageId = await ctx.db.insert("privateMessages", {
      caseId: args.caseId,
      userId: user._id,
      role: "USER" as const,
      content: args.content,
      status: "COMPLETE" as const,
      createdAt: Date.now(),
    });

    // Schedule AI response generation
    await ctx.scheduler.runAfter(0, generateAIResponse, {
      caseId: args.caseId,
      userId: user._id,
    });

    return messageId;
  },
});

// ---------------------------------------------------------------------------
// generateAIResponse — action that streams an AI coach response
// ---------------------------------------------------------------------------

export const generateAIResponse = action({
  args: {
    caseId: v.id("cases"),
    userId: v.id("users"),
  },
  handler: async (ctx: any, args: { caseId: string; userId: string }) => {
    // Fetch case, party state, and message history for prompt assembly
    const caseDoc = await ctx.runQuery(internal.privateCoaching._getCase, {
      caseId: args.caseId,
    });
    if (!caseDoc) {
      throw new Error("Case not found");
    }

    const partyStates = await ctx.runQuery(
      internal.privateCoaching._getPartyStates,
      { caseId: args.caseId },
    );

    const privateMessages = await ctx.runQuery(
      internal.privateCoaching._getPrivateMessagesByCase,
      { caseId: args.caseId, userId: args.userId },
    );

    // Build recent history in Anthropic message format
    const recentHistory: Message[] = privateMessages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }),
    );

    // Assemble the prompt with PRIVATE_COACH role
    const prompt = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: args.caseId as any,
      actingUserId: args.userId as any,
      recentHistory,
      partyStates: partyStates.map(
        (ps: {
          userId: string;
          role: string;
          mainTopic?: string;
          description?: string;
          desiredOutcome?: string;
          synthesisText?: string;
        }) => ({
          userId: ps.userId,
          role: ps.role,
          mainTopic: ps.mainTopic,
          description: ps.description,
          desiredOutcome: ps.desiredOutcome,
          synthesisText: ps.synthesisText,
        }),
      ),
      privateMessages: privateMessages.map(
        (m: { userId: string; role: string; content: string }) => ({
          userId: m.userId,
          role: m.role,
          content: m.content,
        }),
      ),
    });

    // Stream the AI response
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropicClient = new Anthropic();

    await streamAIResponse({
      ctx,
      anthropicClient,
      table: "privateMessages",
      messageFields: {
        caseId: args.caseId,
        userId: args.userId,
        role: "AI",
      },
      model: "claude-sonnet-4-5-20250514",
      systemPrompt: prompt.system,
      userMessages: prompt.messages,
    });
  },
});

// ---------------------------------------------------------------------------
// markComplete — mark private coaching complete for the calling party
// ---------------------------------------------------------------------------

export const markComplete = mutation({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    await requireParty(ctx, args.caseId, user._id);

    // Find the caller's partyState
    const partyStates = await ctx.db
      .query("partyStates")
      .withIndex("by_case_and_user", (q: any) =>
        q.eq("caseId", args.caseId).eq("userId", user._id),
      )
      .collect();

    const partyState = partyStates.find(
      (ps: { userId: string }) => ps.userId === user._id,
    );

    if (!partyState) {
      throwAppError("NOT_FOUND", "Party state not found");
    }

    // Idempotent: if already completed, return without error
    if (partyState.privateCoachingCompletedAt != null) {
      return;
    }

    // Set completion timestamp
    await ctx.db.patch(partyState._id, {
      privateCoachingCompletedAt: Date.now(),
    });

    // Check if both parties have now completed private coaching
    const allPartyStates = await ctx.db
      .query("partyStates")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();

    const bothComplete =
      allPartyStates.length >= 2 &&
      allPartyStates.every(
        (ps: { _id: string; privateCoachingCompletedAt?: number | null }) =>
          ps._id === partyState._id
            ? true // the one we just patched
            : ps.privateCoachingCompletedAt != null,
      );

    if (bothComplete) {
      // Schedule synthesis generation.
      // Use internal reference if available, fall back to string for
      // forward compatibility before the synthesis module exists.
      const synthesisRef =
        internal?.synthesis?.generate ?? "synthesis:generate";
      await ctx.scheduler.runAfter(0, synthesisRef, {
        caseId: args.caseId,
      });
    }
  },
});

// ---------------------------------------------------------------------------
// Internal queries — used by generateAIResponse action to read DB
// ---------------------------------------------------------------------------

export const _getCase = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx: any, args: { caseId: string }) => {
    return await ctx.db.get(args.caseId);
  },
});

export const _getPartyStates = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx: any, args: { caseId: string }) => {
    return await ctx.db
      .query("partyStates")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();
  },
});

export const _getPrivateMessagesByCase = internalQuery({
  args: {
    caseId: v.id("cases"),
    userId: v.id("users"),
  },
  handler: async (
    ctx: any,
    args: { caseId: string; userId: string },
  ) => {
    return await ctx.db
      .query("privateMessages")
      .withIndex("by_case_and_user", (q: any) =>
        q.eq("caseId", args.caseId).eq("userId", args.userId),
      )
      .collect();
  },
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  query,
  mutation,
  internalAction,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { throwAppError } from "./lib/errors";
import { requireAuth } from "./lib/auth";
import { assemblePrompt } from "./lib/prompts";
import { streamAIResponse } from "./lib/streaming";
import { detectReadiness } from "./lib/draftCoachReadiness";
import { enforceCostBudget } from "./lib/costBudget";
import { SONNET_MODEL } from "./lib/models";
import type { Message } from "./lib/prompts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Verify caller is a party to the case via partyStates lookup.
 * Returns the case document and party state. Throws NOT_FOUND / FORBIDDEN.
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

// ---------------------------------------------------------------------------
// AC1: startSession — create an ACTIVE draftSessions row
// ---------------------------------------------------------------------------

export const startSession = mutation({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    const { caseDoc } = await requireCaseParty(ctx, args.caseId, user._id);

    // State validation: only allow during JOINT_ACTIVE
    if (caseDoc.status !== "JOINT_ACTIVE") {
      throwAppError(
        "CONFLICT",
        `Cannot start draft session in status ${caseDoc.status}`,
      );
    }

    const sessionId = await ctx.db.insert("draftSessions", {
      caseId: args.caseId,
      userId: user._id,
      status: "ACTIVE" as const,
      createdAt: Date.now(),
    });

    return sessionId;
  },
});

// ---------------------------------------------------------------------------
// AC2: sendMessage — insert a USER draftMessage and schedule generateResponse
// ---------------------------------------------------------------------------

export const sendMessage = mutation({
  args: {
    sessionId: v.id("draftSessions"),
    content: v.string(),
  },
  handler: async (ctx: any, args: { sessionId: string; content: string }) => {
    const user = await requireAuth(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throwAppError("NOT_FOUND", "Draft session not found");
    }
    if (session.userId !== user._id) {
      throwAppError("FORBIDDEN", "This is not your draft session");
    }
    if (session.status !== "ACTIVE") {
      throwAppError("CONFLICT", "Draft session is no longer active");
    }

    // Validate the case is still JOINT_ACTIVE
    const caseDoc = await ctx.db.get(session.caseId);
    if (!caseDoc || caseDoc.status !== "JOINT_ACTIVE") {
      throwAppError("CONFLICT", "Case is not in JOINT_ACTIVE status");
    }

    // Insert user's draft message
    const messageId = await ctx.db.insert("draftMessages", {
      draftSessionId: args.sessionId,
      role: "USER" as const,
      content: args.content,
      status: "COMPLETE" as const,
      createdAt: Date.now(),
    });

    // Schedule AI response generation
    try {
      await ctx.scheduler.runAfter(0, internal.draftCoach.generateResponse, {
        sessionId: args.sessionId,
      });
    } catch (err) {
      console.error("Failed to schedule draft coach response:", err);
      await ctx.db.insert("draftMessages", {
        draftSessionId: args.sessionId,
        role: "AI" as const,
        content:
          "Sorry, I was unable to process your message. Please try again.",
        status: "ERROR" as const,
        createdAt: Date.now(),
      });
    }

    return messageId;
  },
});

// ---------------------------------------------------------------------------
// AC3 + AC4: generateResponse — action that streams Draft Coach AI response
// with readiness detection
// ---------------------------------------------------------------------------

export const generateResponse = internalAction({
  args: {
    sessionId: v.id("draftSessions"),
  },
  handler: async (ctx: any, args: { sessionId: string }) => {
    // Fetch session
    const session = await ctx.runQuery(internal.draftCoach._getSession, {
      sessionId: args.sessionId,
    });
    if (!session) {
      throw new Error("Draft session not found");
    }

    // Cost budget check — short-circuit if cap exceeded
    const budget = await enforceCostBudget(ctx, session.caseId);
    if (!budget.allowed) {
      const message =
        budget.boilerplate ??
        "AI features are currently unavailable for this case.";
      await ctx.runMutation(internal.draftCoach._insertErrorMessage, {
        sessionId: args.sessionId,
        content: message,
      });
      return;
    }

    // Fetch case
    const caseDoc = await ctx.runQuery(internal.draftCoach._getCase, {
      caseId: session.caseId,
    });
    if (!caseDoc) {
      throw new Error("Case not found");
    }

    // Fetch party states
    const partyStates = await ctx.runQuery(
      internal.draftCoach._getPartyStates,
      { caseId: session.caseId },
    );

    // Fetch draft messages for this session (conversation history)
    const draftMessages = await ctx.runQuery(
      internal.draftCoach._getDraftMessages,
      { sessionId: args.sessionId },
    );

    // Fetch joint chat messages (drafting user's visible context)
    const jointMessages = await ctx.runQuery(
      internal.draftCoach._getJointMessages,
      { caseId: session.caseId },
    );

    // Fetch template version for draftCoachInstructions
    let templateVersion: any = null;
    if (caseDoc.templateVersionId) {
      templateVersion = await ctx.runQuery(
        internal.draftCoach._getTemplateVersion,
        { templateVersionId: caseDoc.templateVersionId },
      );
    }

    // Check readiness from the most recent user message
    const lastUserMessage = [...draftMessages]
      .reverse()
      .find((m: any) => m.role === "USER");
    const isReady = lastUserMessage
      ? detectReadiness(lastUserMessage.content)
      : false;

    // Build recent history in Anthropic message format
    const recentHistory: Message[] = draftMessages.map(
      (m: { role: string; content: string }) => ({
        role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }),
    );

    // If readiness detected, add an instruction to produce a polished draft
    if (isReady) {
      recentHistory.push({
        role: "user" as const,
        content:
          'The user is ready. Produce a polished draft message for the joint chat. Respond with ONLY a JSON object in this format: { "draft": "...polished message..." }',
      });
    }

    // Assemble prompt with DRAFT_COACH role
    // Context: drafting user's joint-chat history + their own synthesis only
    // NOT the other party's synthesis or private content
    const prompt = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: session.caseId as any,
      actingUserId: session.userId as any,
      recentHistory,
      templateVersion: templateVersion
        ? {
            globalGuidance: templateVersion.globalGuidance,
            coachInstructions: templateVersion.coachInstructions,
            draftCoachInstructions: templateVersion.draftCoachInstructions,
          }
        : undefined,
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
      jointMessages: jointMessages.map(
        (m: {
          authorType: string;
          authorUserId?: string;
          content: string;
        }) => ({
          authorType: m.authorType,
          authorUserId: m.authorUserId,
          content: m.content,
        }),
      ),
    });

    // Stream the AI response
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropicClient = new Anthropic();

    try {
      const messageId = await streamAIResponse({
        ctx,
        anthropicClient,
        table: "draftMessages",
        messageFields: {
          draftSessionId: args.sessionId,
          role: "AI",
        },
        model: SONNET_MODEL,
        systemPrompt: prompt.system,
        userMessages: prompt.messages,
        caseId: session.caseId,
      });

      // If readiness was detected, try to extract finalDraft from the response
      if (isReady) {
        const aiMessage = await ctx.runQuery(internal.draftCoach._getMessage, {
          messageId,
        });
        if (aiMessage && aiMessage.status === "COMPLETE") {
          const draft = extractDraft(aiMessage.content);
          if (draft) {
            await ctx.runMutation(internal.draftCoach._setFinalDraft, {
              sessionId: args.sessionId,
              finalDraft: draft,
            });
          }
        }
      }
    } catch (err) {
      console.error(
        "AI streaming failed for draft session",
        args.sessionId,
        ":",
        err,
      );
      await ctx.runMutation(internal.draftCoach._insertErrorMessage, {
        sessionId: args.sessionId,
        content:
          "Sorry, I encountered an error generating a response. Please try sending your message again.",
      });
    }
  },
});

/**
 * Extracts a draft from the AI response content. Tries to parse as JSON
 * with a "draft" field, otherwise falls back to using the raw content.
 */
function extractDraft(content: string): string | null {
  if (!content) return null;

  // Try JSON parse first
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed.draft === "string" && parsed.draft.trim()) {
      return parsed.draft;
    }
  } catch {
    // Not valid JSON — try to extract JSON from the content
    const jsonMatch = content.match(
      /\{[\s\S]*"draft"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    );
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1].replace(/\\"/g, '"').replace(/\\n/g, "\n");
    }
  }

  // If the content looks like a draft message (not a conversation), use it
  // This handles cases where the AI produces a draft without JSON wrapping
  return null;
}

// ---------------------------------------------------------------------------
// AC5: sendFinalDraft — reads finalDraft, posts to joint chat, marks SENT
// ---------------------------------------------------------------------------

export const sendFinalDraft = mutation({
  args: {
    sessionId: v.id("draftSessions"),
  },
  handler: async (ctx: any, args: { sessionId: string }) => {
    const user = await requireAuth(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throwAppError("NOT_FOUND", "Draft session not found");
    }
    if (session.userId !== user._id) {
      throwAppError("FORBIDDEN", "This is not your draft session");
    }
    if (!session.finalDraft) {
      throwAppError(
        "CONFLICT",
        "No final draft available. Generate a draft first.",
      );
    }

    // Post to joint chat by inserting a jointMessages row directly
    // (using the same pattern as jointChat.sendUserMessage but internally)
    const caseDoc = await ctx.db.get(session.caseId);
    if (!caseDoc) {
      throwAppError("NOT_FOUND", "Case not found");
    }
    if (caseDoc.status !== "JOINT_ACTIVE") {
      throwAppError(
        "CONFLICT",
        `Cannot send to joint chat in status ${caseDoc.status}`,
      );
    }

    // Insert the draft as a USER message in joint chat
    await ctx.db.insert("jointMessages", {
      caseId: session.caseId,
      authorType: "USER" as const,
      authorUserId: user._id,
      content: session.finalDraft,
      status: "COMPLETE" as const,
      createdAt: Date.now(),
    });

    // Mark session as SENT
    await ctx.db.patch(args.sessionId, {
      status: "SENT" as const,
      completedAt: Date.now(),
    });

    // Schedule Coach evaluation for the new joint message (defensive)
    const generateRef = (internal as any)?.jointChat?.generateCoachResponse;
    if (generateRef) {
      try {
        await ctx.scheduler.runAfter(0, generateRef, {
          caseId: session.caseId,
        });
      } catch (err) {
        console.error(
          "Failed to schedule coach response after draft send:",
          err,
        );
      }
    }
  },
});

// ---------------------------------------------------------------------------
// AC6: discardSession — mark DISCARDED, no message sent
// ---------------------------------------------------------------------------

export const discardSession = mutation({
  args: {
    sessionId: v.id("draftSessions"),
  },
  handler: async (ctx: any, args: { sessionId: string }) => {
    const user = await requireAuth(ctx);

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throwAppError("NOT_FOUND", "Draft session not found");
    }
    if (session.userId !== user._id) {
      throwAppError("FORBIDDEN", "This is not your draft session");
    }

    await ctx.db.patch(args.sessionId, {
      status: "DISCARDED" as const,
      completedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// AC7: session — query returning current active session and messages
// ---------------------------------------------------------------------------

export const session = query({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    await requireCaseParty(ctx, args.caseId, user._id);

    // Find the caller's active session for this case
    const sessions = await ctx.db
      .query("draftSessions")
      .withIndex("by_case_and_user", (q: any) =>
        q.eq("caseId", args.caseId).eq("userId", user._id),
      )
      .collect();

    // Return the most recent active session (or most recent of any status)
    const activeSession = sessions.find(
      (s: { status: string }) => s.status === "ACTIVE",
    );
    const currentSession = activeSession || sessions[sessions.length - 1];

    if (!currentSession) {
      // Always return the same shape — callers pattern-match on
      // session===null instead of also handling result===null.
      return { session: null, messages: [] };
    }

    // Fetch messages for this session
    const messages = await ctx.db
      .query("draftMessages")
      .withIndex("by_draft_session", (q: any) =>
        q.eq("draftSessionId", currentSession._id),
      )
      .collect();

    return {
      session: currentSession,
      messages: messages.sort(
        (a: { createdAt: number }, b: { createdAt: number }) =>
          a.createdAt - b.createdAt,
      ),
    };
  },
});

// ---------------------------------------------------------------------------
// Internal queries & mutations — used by generateResponse action
// ---------------------------------------------------------------------------

export const _getSession = internalQuery({
  args: { sessionId: v.id("draftSessions") },
  handler: async (ctx: any, args: { sessionId: string }) => {
    return await ctx.db.get(args.sessionId);
  },
});

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

export const _getDraftMessages = internalQuery({
  args: { sessionId: v.id("draftSessions") },
  handler: async (ctx: any, args: { sessionId: string }) => {
    return await ctx.db
      .query("draftMessages")
      .withIndex("by_draft_session", (q: any) =>
        q.eq("draftSessionId", args.sessionId),
      )
      .collect();
  },
});

export const _getJointMessages = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx: any, args: { caseId: string }) => {
    return await ctx.db
      .query("jointMessages")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();
  },
});

export const _getTemplateVersion = internalQuery({
  args: { templateVersionId: v.id("templateVersions") },
  handler: async (ctx: any, args: { templateVersionId: string }) => {
    return await ctx.db.get(args.templateVersionId);
  },
});

export const _getMessage = internalQuery({
  args: { messageId: v.id("draftMessages") },
  handler: async (ctx: any, args: { messageId: string }) => {
    return await ctx.db.get(args.messageId);
  },
});

export const _setFinalDraft = internalMutation({
  args: {
    sessionId: v.id("draftSessions"),
    finalDraft: v.string(),
  },
  handler: async (
    ctx: any,
    args: { sessionId: string; finalDraft: string },
  ) => {
    await ctx.db.patch(args.sessionId, {
      finalDraft: args.finalDraft,
    });
  },
});

export const _insertErrorMessage = internalMutation({
  args: {
    sessionId: v.id("draftSessions"),
    content: v.string(),
  },
  handler: async (ctx: any, args: { sessionId: string; content: string }) => {
    await ctx.db.insert("draftMessages", {
      draftSessionId: args.sessionId,
      role: "AI" as const,
      content: args.content,
      status: "ERROR" as const,
      createdAt: Date.now(),
    });
  },
});

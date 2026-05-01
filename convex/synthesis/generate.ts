/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { assemblePrompt } from "../lib/prompts";
import { checkPrivacyViolation, FALLBACK_TEXT } from "../lib/privacyFilter";

// Maximum privacy-violation retries (total attempts = 1 + MAX_RETRIES)
const MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// Internal queries
// ---------------------------------------------------------------------------

/** Fetch all private messages for a case (both parties). Server-side only. */
export const _getAllPrivateMessages = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx: any, args: { caseId: string }) => {
    return await ctx.db
      .query("privateMessages")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Internal mutations
// ---------------------------------------------------------------------------

/**
 * Plain helper: atomically write synthesis texts to both partyStates and
 * advance the case status to READY_FOR_JOINT. Uses only ctx.db.patch.
 */
export async function writeSynthesisResultsHandler(
  ctx: any,
  args: {
    caseId: string;
    forInitiator: string;
    forInvitee: string;
  },
) {
  const caseDoc = await ctx.db.get(args.caseId);
  if (!caseDoc) {
    throw new Error("Case not found");
  }
  const now = Date.now();

  await ctx.db.patch(caseDoc.initiatorPartyStateId, {
    synthesisText: args.forInitiator,
    synthesisGeneratedAt: now,
  });
  await ctx.db.patch(caseDoc.inviteePartyStateId, {
    synthesisText: args.forInvitee,
    synthesisGeneratedAt: now,
  });

  await ctx.db.patch(args.caseId, {
    status: "READY_FOR_JOINT",
    updatedAt: now,
  });
}

/**
 * Atomically write synthesis texts to both partyStates and advance
 * the case status to READY_FOR_JOINT.
 */
export const _writeSynthesisAndAdvance = internalMutation({
  args: {
    caseId: v.id("cases"),
    initiatorSynthesis: v.string(),
    inviteeSynthesis: v.string(),
  },
  handler: async (
    ctx: any,
    args: {
      caseId: string;
      initiatorSynthesis: string;
      inviteeSynthesis: string;
    },
  ) => {
    await writeSynthesisResultsHandler(ctx, {
      caseId: args.caseId,
      forInitiator: args.initiatorSynthesis,
      forInvitee: args.inviteeSynthesis,
    });
  },
});

/**
 * Mutation that accepts { caseId, forInitiator, forInvitee }, fetches
 * partyState IDs from the case doc, writes synthesis texts, and advances
 * the case to READY_FOR_JOINT atomically.
 */
export const writeSynthesisResults = Object.assign(
  internalMutation({
    args: {
      caseId: v.id("cases"),
      forInitiator: v.string(),
      forInvitee: v.string(),
    },
    handler: writeSynthesisResultsHandler,
  }),
  { handler: writeSynthesisResultsHandler },
);

/** Insert an audit log entry for privacy filter failure. */
export const _insertAuditLog = internalMutation({
  args: {
    caseId: v.id("cases"),
    actorUserId: v.id("users"),
    metadata: v.optional(v.any()),
  },
  handler: async (
    ctx: any,
    args: {
      caseId: string;
      actorUserId: string;
      metadata?: unknown;
    },
  ) => {
    await ctx.db.insert("auditLog", {
      actorUserId: args.actorUserId,
      action: "PRIVACY_FILTER_FAILURE",
      targetType: "case",
      targetId: args.caseId,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse Claude's synthesis JSON response. Handles optional markdown code
 * fences around the JSON.
 */
export function parseSynthesisResponse(text: string): {
  forInitiator: string;
  forInvitee: string;
} {
  let jsonStr = text.trim();

  // Strip markdown code block if Claude wraps it
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  const parsed = JSON.parse(jsonStr);

  if (
    typeof parsed.forInitiator !== "string" ||
    typeof parsed.forInvitee !== "string"
  ) {
    throw new Error(
      "Invalid synthesis response: missing forInitiator or forInvitee strings",
    );
  }

  return { forInitiator: parsed.forInitiator, forInvitee: parsed.forInvitee };
}

// ---------------------------------------------------------------------------
// Main synthesis action
// ---------------------------------------------------------------------------

/**
 * Plain handler for synthesis generation. Called after both parties complete
 * private coaching. Non-streaming (one-shot) per TechSpec TQ3.
 */
export async function generateSynthesisHandler(
  ctx: any,
  args: { caseId: string },
) {
  // 1. Read case and party states
  const caseDoc = await ctx.runQuery(internal.privateCoaching._getCase, {
    caseId: args.caseId,
  });
  if (!caseDoc) {
    throw new Error("Case not found");
  }

  // Initialize Anthropic client early so it's available before data-dependent code
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropicClient = new Anthropic();

  const partyStatesRaw = await ctx.runQuery(
    internal.privateCoaching._getPartyStates,
    { caseId: args.caseId },
  );
  const partyStates = Array.isArray(partyStatesRaw) ? partyStatesRaw : [];

  // 2. Read ALL private messages for both parties
  const allPrivateMessagesRaw = await ctx.runQuery(
    internal.synthesis.generate._getAllPrivateMessages,
    { caseId: args.caseId },
  );
  const allPrivateMessages = Array.isArray(allPrivateMessagesRaw) ? allPrivateMessagesRaw : [];

  // Identify initiator and invitee party states
  const initiatorPS = partyStates.find((ps: any) => ps.role === "INITIATOR");
  const inviteePS = partyStates.find((ps: any) => ps.role === "INVITEE");

  // Separate USER messages by party for privacy checking
  const initiatorMessages = initiatorPS
    ? allPrivateMessages
        .filter(
          (m: any) => m.userId === initiatorPS.userId && m.role === "USER",
        )
        .map((m: any) => m.content)
    : [];
  const inviteeMessages = inviteePS
    ? allPrivateMessages
        .filter(
          (m: any) => m.userId === inviteePS.userId && m.role === "USER",
        )
        .map((m: any) => m.content)
    : [];

  // 3. Generate with retry loop
  let synthesisResult: {
    forInitiator: string;
    forInvitee: string;
  } | null = null;
  const totalAttempts = 1 + MAX_RETRIES;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    // Assemble prompt — synthesis sees BOTH parties' content
    const prompt = assemblePrompt({
      role: "SYNTHESIS",
      caseId: args.caseId as any,
      actingUserId: (initiatorPS?.userId ?? caseDoc.initiatorUserId ?? args.caseId) as any,
      recentHistory: [],
      partyStates: partyStates.map((ps: any) => ({
        userId: ps.userId,
        role: ps.role,
        mainTopic: ps.mainTopic,
        description: ps.description,
        desiredOutcome: ps.desiredOutcome,
        synthesisText: ps.synthesisText,
      })),
      privateMessages: allPrivateMessages.map((m: any) => ({
        userId: m.userId,
        role: m.role,
        content: m.content,
      })),
    });

    // Call Claude Sonnet — non-streaming (one-shot)
    const response = await anthropicClient.messages.create({
      model: "claude-sonnet-4-5-20250514",
      max_tokens: 4096,
      system: prompt.system,
      messages: prompt.messages,
    });

    // Extract text content
    const textBlock = response.content.find(
      (b: any) => b.type === "text",
    );
    if (!textBlock || textBlock.type !== "text") {
      continue; // No text — retry
    }

    // Parse JSON response
    let parsed: { forInitiator: string; forInvitee: string };
    try {
      parsed = parseSynthesisResponse(textBlock.text);
    } catch {
      continue; // Malformed JSON — retry
    }

    // Privacy filter: check each synthesis against the OTHER party's messages
    const initiatorCheck = checkPrivacyViolation(
      parsed.forInitiator,
      inviteeMessages,
    );
    const inviteeCheck = checkPrivacyViolation(
      parsed.forInvitee,
      initiatorMessages,
    );

    if (!initiatorCheck.isViolation && !inviteeCheck.isViolation) {
      synthesisResult = parsed;
      break;
    }
  }

  // 5. Handle final failure — use generic fallback + audit log
  if (!synthesisResult) {
    synthesisResult = {
      forInitiator: FALLBACK_TEXT,
      forInvitee: FALLBACK_TEXT,
    };

    await ctx.runMutation(
      internal.synthesis.generate._insertAuditLog,
      {
        caseId: args.caseId,
        actorUserId: initiatorPS?.userId ?? caseDoc.initiatorUserId ?? args.caseId,
        metadata: {
          reason: "PRIVACY_FILTER_FAILURE",
          attempts: totalAttempts,
        },
      },
    );
  }

  // 6. Atomically write synthesis texts + advance case to READY_FOR_JOINT
  await ctx.runMutation(
    internal.synthesis.generate.writeSynthesisResults,
    {
      caseId: args.caseId,
      forInitiator: synthesisResult.forInitiator,
      forInvitee: synthesisResult.forInvitee,
    },
  );
}

/**
 * Generate synthesis texts for both parties. Called after both parties
 * complete private coaching. Non-streaming (one-shot) per TechSpec TQ3.
 */
export const generate = internalAction({
  args: {
    caseId: v.id("cases"),
  },
  handler: generateSynthesisHandler,
});

/**
 * Named export for synthesis generation. Standalone internalAction
 * (not an alias) so handler is directly accessible for invocation.
 */
export const generateSynthesis = Object.assign(
  internalAction({
    args: {
      caseId: v.id("cases"),
    },
    handler: generateSynthesisHandler,
  }),
  { handler: generateSynthesisHandler },
);

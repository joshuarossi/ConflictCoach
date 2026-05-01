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
 * Atomically write synthesis texts to both partyStates and advance
 * the case status to READY_FOR_JOINT.
 */
export const _writeSynthesisAndAdvance = internalMutation({
  args: {
    caseId: v.id("cases"),
    initiatorSynthesis: v.string(),
    inviteeSynthesis: v.string(),
    initiatorPartyStateId: v.id("partyStates"),
    inviteePartyStateId: v.id("partyStates"),
  },
  handler: async (
    ctx: any,
    args: {
      caseId: string;
      initiatorSynthesis: string;
      inviteeSynthesis: string;
      initiatorPartyStateId: string;
      inviteePartyStateId: string;
    },
  ) => {
    const now = Date.now();

    await ctx.db.patch(args.initiatorPartyStateId, {
      synthesisText: args.initiatorSynthesis,
      synthesisGeneratedAt: now,
    });
    await ctx.db.patch(args.inviteePartyStateId, {
      synthesisText: args.inviteeSynthesis,
      synthesisGeneratedAt: now,
    });

    await ctx.db.patch(args.caseId, {
      status: "READY_FOR_JOINT",
      updatedAt: now,
    });
  },
});

/** Insert an audit log entry for privacy filter failure. */
export const _insertAuditLog = internalMutation({
  args: {
    caseId: v.string(),
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
 * Generate synthesis texts for both parties. Called after both parties
 * complete private coaching. Non-streaming (one-shot) per TechSpec TQ3.
 */
export const generate = internalAction({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    // 1. Read case and party states
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
    if (partyStates.length < 2) {
      throw new Error("Both party states required for synthesis");
    }

    // 2. Read ALL private messages for both parties
    const allPrivateMessages = await ctx.runQuery(
      internal.synthesis.generate._getAllPrivateMessages,
      { caseId: args.caseId },
    );

    // Identify initiator and invitee party states
    const initiatorPS = partyStates.find(
      (ps: any) => ps.role === "INITIATOR",
    );
    const inviteePS = partyStates.find((ps: any) => ps.role === "INVITEE");
    if (!initiatorPS || !inviteePS) {
      throw new Error("Missing initiator or invitee party state");
    }

    // Separate USER messages by party for privacy checking
    const initiatorMessages = allPrivateMessages
      .filter(
        (m: any) => m.userId === initiatorPS.userId && m.role === "USER",
      )
      .map((m: any) => m.content);
    const inviteeMessages = allPrivateMessages
      .filter(
        (m: any) => m.userId === inviteePS.userId && m.role === "USER",
      )
      .map((m: any) => m.content);

    // 3. Initialize Anthropic client
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropicClient = new Anthropic();

    // 4. Generate with retry loop
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
        actingUserId: initiatorPS.userId as any,
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
          actorUserId: initiatorPS.userId,
          metadata: {
            reason: "PRIVACY_FILTER_FAILURE",
            attempts: totalAttempts,
          },
        },
      );
    }

    // 6. Atomically write synthesis texts + advance case to READY_FOR_JOINT
    await ctx.runMutation(
      internal.synthesis.generate._writeSynthesisAndAdvance,
      {
        caseId: args.caseId,
        initiatorSynthesis: synthesisResult.forInitiator,
        inviteeSynthesis: synthesisResult.forInvitee,
        initiatorPartyStateId: initiatorPS._id,
        inviteePartyStateId: inviteePS._id,
      },
    );
  },
});

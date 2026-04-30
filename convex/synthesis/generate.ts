/* eslint-disable @typescript-eslint/no-explicit-any */
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { assemblePrompt } from "../lib/prompts";
import { checkPrivacyViolation, FALLBACK_TEXT } from "../lib/privacyFilter";
import type { Message } from "../lib/prompts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 2; // regenerate up to 2 times on privacy violation
const MODEL = "claude-sonnet-4-5-20250514";
const TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Internal queries
// ---------------------------------------------------------------------------

/** Fetch all private messages for a case (both parties). */
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
// Internal mutation — atomic write of synthesis + case status advance
// ---------------------------------------------------------------------------

export const _writeSynthesisAndAdvance = internalMutation({
  args: {
    caseId: v.id("cases"),
    initiatorPartyStateId: v.id("partyStates"),
    inviteePartyStateId: v.id("partyStates"),
    forInitiator: v.string(),
    forInvitee: v.string(),
  },
  handler: async (
    ctx: any,
    args: {
      caseId: string;
      initiatorPartyStateId: string;
      inviteePartyStateId: string;
      forInitiator: string;
      forInvitee: string;
    },
  ) => {
    const now = Date.now();

    // Write synthesis to both party states
    await ctx.db.patch(args.initiatorPartyStateId, {
      synthesisText: args.forInitiator,
      synthesisGeneratedAt: now,
    });

    await ctx.db.patch(args.inviteePartyStateId, {
      synthesisText: args.forInvitee,
      synthesisGeneratedAt: now,
    });

    // Advance case status to READY_FOR_JOINT
    await ctx.db.patch(args.caseId, {
      status: "READY_FOR_JOINT",
      updatedAt: now,
    });
  },
});

// ---------------------------------------------------------------------------
// Internal mutation — write audit log entry for privacy filter failure
// ---------------------------------------------------------------------------

export const _writeAuditLog = internalMutation({
  args: {
    caseId: v.id("cases"),
    initiatorUserId: v.string(),
    metadata: v.any(),
  },
  handler: async (
    ctx: any,
    args: { caseId: string; initiatorUserId: string; metadata: any },
  ) => {
    await ctx.db.insert("auditLog", {
      actorUserId: args.initiatorUserId,
      action: "PRIVACY_FILTER_FAILURE",
      targetType: "case",
      targetId: args.caseId,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// generateSynthesis — internal action scheduled by markComplete
// ---------------------------------------------------------------------------

interface SynthesisResult {
  forInitiator: string;
  forInvitee: string;
}

export function parseSynthesisResponse(raw: string): SynthesisResult {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof parsed.forInitiator !== "string" ||
    typeof parsed.forInvitee !== "string"
  ) {
    throw new Error(
      "Invalid synthesis response shape: expected { forInitiator: string, forInvitee: string }",
    );
  }

  return { forInitiator: parsed.forInitiator, forInvitee: parsed.forInvitee };
}

export const generateSynthesis = internalAction({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    // 1. Fetch case, party states, and all private messages
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
      throw new Error("Expected two party states for synthesis");
    }

    const allPrivateMessages = await ctx.runQuery(
      internal.synthesis.generate._getAllPrivateMessages,
      { caseId: args.caseId },
    );

    // Identify initiator and invitee party states
    const initiatorPS = partyStates.find(
      (ps: { role: string }) => ps.role === "INITIATOR",
    );
    const inviteePS = partyStates.find(
      (ps: { role: string }) => ps.role === "INVITEE",
    );

    if (!initiatorPS || !inviteePS) {
      throw new Error("Missing initiator or invitee party state");
    }

    // Separate private messages by party
    const initiatorMessages = allPrivateMessages
      .filter((m: { userId: string }) => m.userId === initiatorPS.userId)
      .map((m: { role: string; content: string }) => m.content);
    const inviteeMessages = allPrivateMessages
      .filter((m: { userId: string }) => m.userId === inviteePS.userId)
      .map((m: { role: string; content: string }) => m.content);

    // 2. Assemble prompt using the SYNTHESIS role
    const recentHistory: Message[] = [
      {
        role: "user" as const,
        content:
          "Please generate the synthesis texts for both parties based on their private coaching content.",
      },
    ];

    const prompt = assemblePrompt({
      role: "SYNTHESIS",
      caseId: args.caseId as any,
      actingUserId: initiatorPS.userId as any,
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
      privateMessages: allPrivateMessages.map(
        (m: { userId: string; role: string; content: string }) => ({
          userId: m.userId,
          role: m.role,
          content: m.content,
        }),
      ),
    });

    // 3. Call Claude (non-streaming) with retry logic
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropicClient = new Anthropic();

    const totalAttempts = 1 + MAX_RETRIES;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      try {
        // Call Claude — non-streaming, one-shot (TechSpec TQ3)
        const response = await Promise.race([
          anthropicClient.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: prompt.system,
            messages: prompt.messages,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("AI request timed out")), TIMEOUT_MS),
          ),
        ]);

        // Handle content filter / stop reason
        if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
          // Normal completion — proceed
        } else if (response.stop_reason === "content_filter") {
          throw new Error("Content filter triggered on synthesis response");
        }

        // Extract text content
        const textBlock = response.content.find(
          (block: { type: string }) => block.type === "text",
        );
        if (!textBlock || textBlock.type !== "text") {
          throw new Error("No text content in Claude response");
        }

        // Parse JSON response
        const synthesis = parseSynthesisResponse(textBlock.text);

        // 4. Privacy filter: check each synthesis against the OTHER party's messages
        const initiatorCheck = checkPrivacyViolation(
          synthesis.forInitiator,
          inviteeMessages,
        );
        const inviteeCheck = checkPrivacyViolation(
          synthesis.forInvitee,
          initiatorMessages,
        );

        if (initiatorCheck.isViolation || inviteeCheck.isViolation) {
          lastError = new Error("Privacy violation detected in synthesis");
          continue; // Retry
        }

        // 5. Write synthesis and advance case — single atomic mutation
        await ctx.runMutation(internal.synthesis.generate._writeSynthesisAndAdvance, {
          caseId: args.caseId,
          initiatorPartyStateId: initiatorPS._id,
          inviteePartyStateId: inviteePS._id,
          forInitiator: synthesis.forInitiator,
          forInvitee: synthesis.forInvitee,
        });

        return; // Success
      } catch (err: any) {
        // Retry on 429 rate limit (TechSpec §6.5)
        if (err?.status === 429) {
          lastError = err;
          continue;
        }

        // All other errors (auth failure, schema error, etc.) are non-retryable — fail fast
        throw err;
      }
    }

    // All attempts exhausted — use generic fallback and flag for review
    await ctx.runMutation(internal.synthesis.generate._writeAuditLog, {
      caseId: args.caseId,
      initiatorUserId: initiatorPS.userId,
      metadata: {
        reason: lastError?.message ?? "Unknown error",
        attempts: totalAttempts,
      },
    });

    await ctx.runMutation(internal.synthesis.generate._writeSynthesisAndAdvance, {
      caseId: args.caseId,
      initiatorPartyStateId: initiatorPS._id,
      inviteePartyStateId: inviteePS._id,
      forInitiator: FALLBACK_TEXT,
      forInvitee: FALLBACK_TEXT,
    });
  },
});

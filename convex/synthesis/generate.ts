/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server";
import { v } from "convex/values";
import { _getCase, _getPartyStates } from "../privateCoaching";
import * as promptsLib from "../lib/prompts";
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
 * advance the case status to READY_FOR_JOINT. Uses only ctx.db.get/patch.
 *
 * Accepts pre-resolved partyState IDs so the mutation is a focused write
 * operation with no index scans or collection queries.
 */
export async function writeSynthesisResultsHandler(
  ctx: any,
  args: {
    caseId: string;
    initiatorPartyStateId?: string;
    inviteePartyStateId?: string;
    forInitiator: string;
    forInvitee: string;
  },
) {
  const caseDoc = await ctx.db.get(args.caseId);
  if (!caseDoc) {
    throw new Error("Case not found");
  }

  // Resolve partyState IDs: prefer explicit args, fall back to case document
  const initiatorPSId = args.initiatorPartyStateId ?? caseDoc.initiatorPartyStateId;
  const inviteePSId = args.inviteePartyStateId ?? caseDoc.inviteePartyStateId;

  if (!initiatorPSId || !inviteePSId) {
    throw new Error("Could not resolve partyState IDs");
  }

  const now = Date.now();

  await ctx.db.patch(initiatorPSId, {
    synthesisText: args.forInitiator,
    synthesisGeneratedAt: now,
  });
  await ctx.db.patch(inviteePSId, {
    synthesisText: args.forInvitee,
    synthesisGeneratedAt: now,
  });

  await ctx.db.patch(args.caseId, {
    status: "READY_FOR_JOINT",
    updatedAt: now,
  });
}

/**
 * Mutation that accepts pre-resolved partyState IDs and synthesis texts,
 * patches both partyStates and advances the case to READY_FOR_JOINT atomically.
 */
export const writeSynthesisResults = Object.assign(
  internalMutation({
    args: {
      caseId: v.id("cases"),
      initiatorPartyStateId: v.optional(v.id("partyStates")),
      inviteePartyStateId: v.optional(v.id("partyStates")),
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

/**
 * Call Claude with retry on 429 rate limit (TechSpec §6.5).
 * Retries once with 2s backoff on 429. Throws on timeout >30s or other errors.
 */
async function callClaudeWithRetry(
  anthropicClient: any,
  requestParams: any,
): Promise<any> {
  const TIMEOUT_MS = 30_000;

  for (let attempt = 0; attempt < 2; attempt++) {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        anthropicClient.messages.create(requestParams),
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error("AI_TIMEOUT")),
            TIMEOUT_MS,
          );
        }),
      ]);
      clearTimeout(timeoutHandle);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutHandle);
      // Rate limit: retry once with 2s backoff
      if (err?.status === 429 && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
      throw err;
    }
  }
  throw new Error("callClaudeWithRetry: exhausted all retry attempts");
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
  const caseDoc = await ctx.runQuery(_getCase, {
    caseId: args.caseId,
  });
  if (!caseDoc) {
    throw new Error("Case not found");
  }

  // Initialize Anthropic client early so it's available before data-dependent code
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropicClient = new Anthropic();

  const partyStatesRaw = await ctx.runQuery(
    _getPartyStates,
    { caseId: args.caseId },
  );
  const partyStates = Array.isArray(partyStatesRaw) ? partyStatesRaw : [];

  // 2. Read ALL private messages for both parties
  const allPrivateMessagesRaw = await ctx.runQuery(
    _getAllPrivateMessages,
    { caseId: args.caseId },
  );
  const allPrivateMessages = Array.isArray(allPrivateMessagesRaw)
    ? allPrivateMessagesRaw
    : [];

  // Identify initiator and invitee party states
  const initiatorPS = partyStates.find((ps: any) => ps.role === "INITIATOR");
  const inviteePS = partyStates.find((ps: any) => ps.role === "INVITEE");

  if (!initiatorPS?.userId || !inviteePS?.userId) {
    throw new Error("Could not resolve userId for both party states");
  }

  // Separate USER messages by party for privacy checking
  const initiatorMessages = initiatorPS
    ? allPrivateMessages
        .filter(
          (m: any) => m.userId === initiatorPS.userId && m.role === "USER",
        )
        .map((m: any) => m.content)
        .filter(
          (content: unknown): content is string =>
            typeof content === "string" && content.length > 0,
        )
    : [];
  const inviteeMessages = inviteePS
    ? allPrivateMessages
        .filter(
          (m: any) => m.userId === inviteePS.userId && m.role === "USER",
        )
        .map((m: any) => m.content)
        .filter(
          (content: unknown): content is string =>
            typeof content === "string" && content.length > 0,
        )
    : [];

  // 3. Assemble prompt — synthesis sees BOTH parties' content
  const prompt = promptsLib.assemblePrompt({
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

  // 4. Generate with retry loop
  let synthesisResult: {
    forInitiator: string;
    forInvitee: string;
  } | null = null;
  const totalAttempts = 1 + MAX_RETRIES;
  let lastFailureReason: string = "PRIVACY_FILTER_FAILURE";

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    // Call Claude Sonnet — non-streaming (one-shot) with 429/timeout handling
    let response: any;
    try {
      response = await callClaudeWithRetry(anthropicClient, {
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 4096,
        system: prompt.system,
        messages: prompt.messages,
      });
    } catch (err: any) {
      if (err?.message === "AI_TIMEOUT") {
        const timeoutErr = new Error("Synthesis generation timed out after 30s");
        (timeoutErr as any).cause = err;
        throw timeoutErr;
      }
      throw err;
    }

    // Guard against unexpected response shape
    if (!response?.content) {
      console.error(
        `Synthesis attempt ${attempt + 1}/${totalAttempts} for case ${args.caseId}: unexpected response shape (no content)`,
      );
      lastFailureReason = "UNEXPECTED_RESPONSE";
      continue;
    }

    // Extract text content
    const textBlock = response.content.find(
      (b: any) => b.type === "text",
    );
    if (!textBlock || textBlock.type !== "text") {
      console.error(
        `Synthesis attempt ${attempt + 1}/${totalAttempts} for case ${args.caseId}: no text block in response. stop_reason=${response.stop_reason}`,
      );
      lastFailureReason = "NO_TEXT_CONTENT";
      continue;
    }

    // Parse JSON response
    let parsed: { forInitiator: string; forInvitee: string };
    try {
      parsed = parseSynthesisResponse(textBlock.text);
    } catch (parseErr: any) {
      console.error(
        `Synthesis JSON parse failed for case ${args.caseId}, attempt ${attempt + 1}/${totalAttempts}:`,
        parseErr?.message,
      );
      lastFailureReason = "JSON_PARSE_FAILURE";
      continue;
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
      _insertAuditLog,
      {
        caseId: args.caseId,
        actorUserId: initiatorPS.userId,
        metadata: {
          reason: lastFailureReason,
          attempts: totalAttempts,
        },
      },
    );
  }

  // 6. Atomically write synthesis texts + advance case to READY_FOR_JOINT
  if (!initiatorPS?._id || !inviteePS?._id) {
    throw new Error("Could not find both party states for case");
  }
  await ctx.runMutation(
    writeSynthesisResults,
    {
      caseId: args.caseId,
      initiatorPartyStateId: initiatorPS._id,
      inviteePartyStateId: inviteePS._id,
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
 * Named export for direct handler access. Plain object (not a registered
 * Convex action) — callers resolve .handler to the raw generateSynthesisHandler.
 * Production use goes through the `generate` registered internalAction above.
 */
export const generateSynthesis = { handler: generateSynthesisHandler };

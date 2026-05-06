/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation, action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { throwAppError } from "./lib/errors";
import { requireAuth } from "./lib/auth";
import { validateTransition } from "./lib/stateMachine";
import { assemblePrompt } from "./lib/prompts";
import { streamAIResponse } from "./lib/streaming";
import { checkPrivacyViolation, FALLBACK_TEXT } from "./lib/privacyFilter";
import { CLASSIFICATION_BUDGET, compressContext } from "./lib/compression";
import { enforceCostBudget, SOFT_CAP_BOILERPLATE, recordUsageFromAction } from "./lib/costBudget";
import type { Message } from "./lib/prompts";

// ---------------------------------------------------------------------------
// Classification types & constants
// ---------------------------------------------------------------------------

export type Classification =
  | "INFLAMMATORY"
  | "PROGRESS"
  | "QUESTION_TO_COACH"
  | "NORMAL_EXCHANGE";

export const CLASSIFICATIONS_REQUIRING_RESPONSE: Classification[] = [
  "INFLAMMATORY",
  "PROGRESS",
  "QUESTION_TO_COACH",
];

/**
 * Returns true if the classification triggers an intervention-style message
 * (currently only INFLAMMATORY).
 */
export function getIsIntervention(classification: Classification): boolean {
  return classification === "INFLAMMATORY";
}

// ---------------------------------------------------------------------------
// Opening message prompt builder
// ---------------------------------------------------------------------------

/**
 * Builds the user prompt for the Coach's opening message when a case
 * transitions to JOINT_ACTIVE. Grounded in the case's mainTopic and category,
 * welcoming both parties.
 */
export function buildOpeningMessagePrompt(opts: {
  mainTopic: string;
  category: string;
}): string {
  return (
    `This is the beginning of a joint conversation. The topic is "${opts.mainTopic}" ` +
    `in the category "${opts.category}". ` +
    `Please welcome both parties and set a constructive tone for the discussion. ` +
    `Acknowledge the topic and encourage open, respectful dialogue.`
  );
}

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

// ---------------------------------------------------------------------------
// enterJointSession — advance case from READY_FOR_JOINT → JOINT_ACTIVE
// ---------------------------------------------------------------------------

export const enterJointSession = mutation({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    const user = await requireAuth(ctx);
    const { caseDoc } = await requireCaseParty(ctx, args.caseId, user._id);

    // Validate transition via state machine
    validateTransition(caseDoc.status, "JOINT_ACTIVE");

    // Transition to JOINT_ACTIVE
    await ctx.db.patch(args.caseId, {
      status: "JOINT_ACTIVE",
      updatedAt: Date.now(),
    });

    // Schedule Coach opening message
    const generateRef = (internal as any)?.jointChat?.generateOpeningMessage;
    if (generateRef) {
      try {
        await ctx.scheduler.runAfter(0, generateRef, {
          caseId: args.caseId,
        });
      } catch (err) {
        console.error("Failed to schedule opening message:", err);
      }
    }
  },
});

// ---------------------------------------------------------------------------
// Internal queries — used by generateCoachResponse action to read DB
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

export const _getJointMessages = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx: any, args: { caseId: string }) => {
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

export const _getPrivateMessagesByCase = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx: any, args: { caseId: string }) => {
    return await ctx.db
      .query("privateMessages")
      .withIndex("by_case", (q: any) => q.eq("caseId", args.caseId))
      .collect();
  },
});

// ---------------------------------------------------------------------------
// Haiku classification gate
// ---------------------------------------------------------------------------

const CLASSIFICATION_SYSTEM_PROMPT =
  "You are a message classifier for a conflict resolution chat. " +
  "Classify the user's latest message into exactly one category. " +
  "Respond with ONLY one of these labels: INFLAMMATORY, PROGRESS, QUESTION_TO_COACH, NORMAL_EXCHANGE. " +
  "INFLAMMATORY: hostile, insulting, aggressive, or escalating language. " +
  "PROGRESS: acknowledgment of agreement, concession, or forward movement. " +
  "QUESTION_TO_COACH: directly addressing the coach or asking for help/guidance. " +
  "NORMAL_EXCHANGE: ordinary conversation that doesn't need coach intervention.";

const VALID_CLASSIFICATIONS: Classification[] = [
  "INFLAMMATORY",
  "PROGRESS",
  "QUESTION_TO_COACH",
  "NORMAL_EXCHANGE",
];

export interface ClassificationResult {
  classification: Classification;
  usage?: { input_tokens: number; output_tokens: number };
}

export async function classifyMessage(
  anthropicClient: any,
  messageContent: string,
  contextMessages?: Message[],
): Promise<Classification>;
export async function classifyMessage(
  anthropicClient: any,
  messageContent: string,
  contextMessages: Message[],
  returnUsage: true,
): Promise<ClassificationResult>;
export async function classifyMessage(
  anthropicClient: any,
  messageContent: string,
  contextMessages?: Message[],
  returnUsage?: boolean,
): Promise<Classification | ClassificationResult> {
  const messages = contextMessages ?? [];
  // Compress context if needed to stay within Haiku's 10k classification budget
  const classificationMessages = compressContext(
    [
      ...messages,
      { role: "user" as const, content: `Classify this message: "${messageContent}"` },
    ],
    CLASSIFICATION_SYSTEM_PROMPT,
    CLASSIFICATION_BUDGET,
  );

  const response = await anthropicClient.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 20,
    system: CLASSIFICATION_SYSTEM_PROMPT,
    messages: classificationMessages,
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

  // Parse classification — match against valid labels
  const upper = text.toUpperCase().replace(/[^A-Z_]/g, "");
  let classification: Classification = "NORMAL_EXCHANGE";
  if (VALID_CLASSIFICATIONS.includes(upper as Classification)) {
    classification = upper as Classification;
  }

  if (returnUsage) {
    return {
      classification,
      usage: response.usage
        ? {
            input_tokens: response.usage.input_tokens ?? 0,
            output_tokens: response.usage.output_tokens ?? 0,
          }
        : undefined,
    };
  }

  return classification;
}

// ---------------------------------------------------------------------------
// generateCoachResponse — action: classify then generate
//
// Supports two call shapes:
//
//   1. **Runtime (Convex action scheduler):** `{ caseId, messageId }` — the
//      handler fetches case/party/messages via internal queries.
//
//   2. **DI / test shape:** `{ caseId, messageText, jointHistory, syntheses,
//      anthropicClient, privateContents? }` — the caller supplies all data
//      and the Anthropic client directly. Used by unit tests; also useful
//      when the caller already has the data in scope.
//
// Both shapes converge on the same classify-then-stream pipeline.
// ---------------------------------------------------------------------------

const MAX_PRIVACY_RETRIES = 2;

interface CoachResponseDIArgs {
  caseId: string;
  messageText: string;
  jointHistory?: Message[];
  syntheses?: { partyA?: string; partyB?: string };
  privateContents?: string[];
  anthropicClient: any;
}

interface CoachResponseRuntimeArgs {
  caseId: string;
  messageId: string;
}

function isDIArgs(
  args: CoachResponseDIArgs | CoachResponseRuntimeArgs,
): args is CoachResponseDIArgs {
  return "messageText" in args && "anthropicClient" in args;
}

export async function generateCoachResponseHandler(
  ctx: any,
  rawArgs: CoachResponseDIArgs | CoachResponseRuntimeArgs,
): Promise<void> {
    // Cost budget check (runtime path only — DI callers manage their own budget)
    if (!isDIArgs(rawArgs)) {
      const budget = await enforceCostBudget(ctx, rawArgs.caseId);
      if (!budget.allowed && budget.status === "hard_cap") {
        // Hard cap: no AI at all
        return;
      }
      // Soft cap is handled below after classification (classification still runs)
    }

    let triggeringMessageContent: string;
    let contextHistory: Message[];
    let promptPartyStates: Array<{
      userId: string;
      role: string;
      mainTopic?: string;
      description?: string;
      desiredOutcome?: string;
      synthesisText?: string;
    }>;
    let promptJointMessages: Array<{
      authorType: string;
      authorUserId?: string;
      content: string;
    }>;
    let initiatorUserId: string;
    let allPrivateContents: string[];
    let anthropicClient: any;

    if (isDIArgs(rawArgs)) {
      // DI shape — caller supplies everything
      triggeringMessageContent = rawArgs.messageText;
      contextHistory = rawArgs.jointHistory ?? [];
      anthropicClient = rawArgs.anthropicClient;
      allPrivateContents = rawArgs.privateContents ?? [];
      // Build party states from synthesis blob (DI tests don't seed party rows)
      promptPartyStates = [
        {
          userId: "party-a",
          role: "INITIATOR",
          synthesisText: rawArgs.syntheses?.partyA,
        },
        {
          userId: "party-b",
          role: "INVITEE",
          synthesisText: rawArgs.syntheses?.partyB,
        },
      ];
      promptJointMessages = contextHistory.map((m) => ({
        authorType: m.role === "assistant" ? "COACH" : "USER",
        content: m.content,
      }));
      initiatorUserId = "party-a";
    } else {
      // Runtime shape — fetch via internal queries
      const caseDoc = await ctx.runQuery(internal.jointChat._getCase, {
        caseId: rawArgs.caseId,
      });
      if (!caseDoc) {
        throw new Error("Case not found");
      }
      const partyStates = await ctx.runQuery(
        internal.jointChat._getPartyStates,
        { caseId: rawArgs.caseId },
      );
      const jointMsgs = await ctx.runQuery(
        internal.jointChat._getJointMessages,
        { caseId: rawArgs.caseId },
      );
      const privateMessages = await ctx.runQuery(
        internal.jointChat._getPrivateMessagesByCase,
        { caseId: rawArgs.caseId },
      );
      const triggeringMessage = jointMsgs.find(
        (m: any) => m._id === rawArgs.messageId,
      );
      if (!triggeringMessage) {
        throw new Error("Triggering message not found");
      }
      triggeringMessageContent = triggeringMessage.content;
      contextHistory = jointMsgs
        .filter((m: any) => m._id !== rawArgs.messageId)
        .map((m: any) => ({
          role:
            m.authorType === "COACH"
              ? ("assistant" as const)
              : ("user" as const),
          content: m.content,
        }));
      promptPartyStates = partyStates.map((ps: any) => ({
        userId: ps.userId,
        role: ps.role,
        mainTopic: ps.mainTopic,
        description: ps.description,
        desiredOutcome: ps.desiredOutcome,
        synthesisText: ps.synthesisText,
      }));
      promptJointMessages = jointMsgs.map((m: any) => ({
        authorType: m.authorType,
        authorUserId: m.authorUserId,
        content: m.content,
      }));
      initiatorUserId = caseDoc.initiatorUserId;
      allPrivateContents = privateMessages.map((m: any) => m.content);
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      anthropicClient = new Anthropic();
    }

    // Classify via Haiku gate
    const classificationResult = await classifyMessage(
      anthropicClient,
      triggeringMessageContent,
      contextHistory,
      true,
    );
    const classification = classificationResult.classification;

    // Record Haiku classification usage
    if (!isDIArgs(rawArgs) && classificationResult.usage) {
      try {
        await recordUsageFromAction(
          ctx,
          rawArgs.caseId,
          classificationResult.usage.input_tokens,
          classificationResult.usage.output_tokens,
          "haiku",
        );
      } catch (usageErr) {
        console.error("Failed to record classification usage:", usageErr);
      }
    }

    // Exit early for NORMAL_EXCHANGE — no coach response
    if (classification === "NORMAL_EXCHANGE") {
      return;
    }

    // Soft cap check: classification ran (cheap Haiku), but generation is
    // replaced with boilerplate at soft cap
    if (!isDIArgs(rawArgs)) {
      const budget = await enforceCostBudget(ctx, rawArgs.caseId);
      if (!budget.allowed && budget.status === "soft_cap") {
        // Insert boilerplate as a COACH message instead of calling Sonnet
        await ctx.runMutation(
          (internal as any).lib.streaming.insertStreamingMessage,
          {
            table: "jointMessages",
            caseId: rawArgs.caseId,
            authorType: "COACH",
            isIntervention: false,
            content: SOFT_CAP_BOILERPLATE,
            status: "COMPLETE" as const,
            createdAt: Date.now(),
          },
        );
        return;
      }
    }

    // Assemble coach prompt (includes synthesis texts + joint history,
    // NOT raw private messages)
    const prompt = assemblePrompt({
      role: "COACH",
      caseId: rawArgs.caseId as any,
      actingUserId: initiatorUserId as any,
      recentHistory: [
        { role: "user" as const, content: triggeringMessageContent },
      ],
      templateVersion: undefined,
      partyStates: promptPartyStates as any,
      jointMessages: promptJointMessages as any,
    });

    // Determine isIntervention flag
    const isIntervention = getIsIntervention(classification);

    try {
      const messageId = await streamAIResponse({
        ctx,
        anthropicClient,
        table: "jointMessages",
        messageFields: {
          caseId: rawArgs.caseId,
          authorType: "COACH",
          isIntervention,
        },
        model: "claude-sonnet-4-5-20250514",
        systemPrompt: prompt.system,
        userMessages: prompt.messages,
        caseId: rawArgs.caseId,
      });

      // Privacy filter (runtime-only — requires runQuery to re-read the
      // message). DI callers can run their own privacy check.
      if (!isDIArgs(rawArgs) && allPrivateContents.length > 0) {
        const completedMsgs = await ctx.runQuery(
          internal.jointChat._getJointMessages,
          { caseId: rawArgs.caseId },
        );
        const coachMsg = completedMsgs.find(
          (m: any) => m._id === messageId,
        );
        if (coachMsg && coachMsg.status === "COMPLETE") {
          const violation = checkPrivacyViolation(
            coachMsg.content,
            allPrivateContents,
          );
          if (violation.isViolation) {
            // Retry up to MAX_PRIVACY_RETRIES times
            let retrySuccess = false;
            for (let retry = 0; retry < MAX_PRIVACY_RETRIES; retry++) {
              await ctx.runMutation(
                (internal as any).lib.streaming.updateStreamingMessage,
                {
                  messageId,
                  content: "",
                  status: "STREAMING" as const,
                },
              );
              await streamAIResponse({
                ctx,
                anthropicClient,
                table: "jointMessages",
                messageFields: {
                  caseId: rawArgs.caseId,
                  authorType: "COACH",
                  isIntervention,
                },
                model: "claude-sonnet-4-5-20250514",
                systemPrompt: prompt.system,
                userMessages: prompt.messages,
              });
              const retryMsgs = await ctx.runQuery(
                internal.jointChat._getJointMessages,
                { caseId: rawArgs.caseId },
              );
              const retryMsg = retryMsgs.find(
                (m: any) => m._id === messageId,
              );
              if (
                retryMsg &&
                !checkPrivacyViolation(retryMsg.content, allPrivateContents)
                  .isViolation
              ) {
                retrySuccess = true;
                break;
              }
            }
            if (!retrySuccess) {
              await ctx.runMutation(
                (internal as any).lib.streaming.updateStreamingMessage,
                {
                  messageId,
                  content: FALLBACK_TEXT,
                  status: "COMPLETE" as const,
                },
              );
            }
          }
        }
      }
    } catch (err) {
      console.error(
        "Coach AI streaming failed for case",
        rawArgs.caseId,
        ":",
        err,
      );
      if (!isDIArgs(rawArgs)) {
        await ctx.runMutation(
          (internal as any).lib.streaming.insertStreamingMessage,
          {
            table: "jointMessages",
            caseId: rawArgs.caseId,
            authorType: "COACH",
            isIntervention: false,
            content:
              "Sorry, I encountered an error generating a response. Please try sending your message again.",
            status: "ERROR" as const,
            createdAt: Date.now(),
          },
        );
      }
    }
}

/**
 * Convex action wrapper around generateCoachResponseHandler.
 * Used by the scheduler in jointChat.sendUserMessage.
 */
export const generateCoachResponse = action({
  args: {
    caseId: v.id("cases"),
    messageId: v.optional(v.id("jointMessages")),
  },
  handler: async (
    ctx: any,
    args: { caseId: string; messageId?: string },
  ): Promise<void> => {
    if (!args.messageId) {
      throw new Error("messageId is required for runtime invocation");
    }
    return generateCoachResponseHandler(ctx, {
      caseId: args.caseId,
      messageId: args.messageId,
    });
  },
});

// ---------------------------------------------------------------------------
// generateOpeningMessage — action: create Coach welcome when JOINT_ACTIVE
// ---------------------------------------------------------------------------

export const generateOpeningMessage = action({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    // Cost budget check
    const budget = await enforceCostBudget(ctx, args.caseId);
    if (!budget.allowed) {
      // At either cap, insert a static welcome instead of calling Claude
      await ctx.runMutation(
        (internal as any).lib.streaming.insertStreamingMessage,
        {
          table: "jointMessages",
          caseId: args.caseId,
          authorType: "COACH",
          isIntervention: false,
          content: budget.boilerplate ??
            "Welcome to the joint session. I'm here to help facilitate your conversation.",
          status: "COMPLETE" as const,
          createdAt: Date.now(),
        },
      );
      return;
    }

    const caseDoc = await ctx.runQuery(internal.jointChat._getCase, {
      caseId: args.caseId,
    });
    if (!caseDoc) {
      throw new Error("Case not found");
    }

    // Get party states for the case's mainTopic
    const partyStates = await ctx.runQuery(
      internal.jointChat._getPartyStates,
      { caseId: args.caseId },
    );

    // Use initiator's mainTopic (or first available)
    const initiatorState = partyStates.find(
      (ps: any) => ps.role === "INITIATOR",
    );
    const mainTopic =
      initiatorState?.mainTopic ?? partyStates[0]?.mainTopic ?? "the situation";
    const category = caseDoc.category ?? "general";

    const openingPrompt = buildOpeningMessagePrompt({ mainTopic, category });

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropicClient = new Anthropic();

    // Assemble coach prompt with opening context
    const prompt = assemblePrompt({
      role: "COACH",
      caseId: args.caseId as any,
      actingUserId: caseDoc.initiatorUserId as any,
      recentHistory: [{ role: "user" as const, content: openingPrompt }],
      templateVersion: undefined,
      partyStates: partyStates.map((ps: any) => ({
        userId: ps.userId,
        role: ps.role,
        mainTopic: ps.mainTopic,
        description: ps.description,
        desiredOutcome: ps.desiredOutcome,
        synthesisText: ps.synthesisText,
      })),
      jointMessages: [],
    });

    try {
      await streamAIResponse({
        ctx,
        anthropicClient,
        table: "jointMessages",
        messageFields: {
          caseId: args.caseId,
          authorType: "COACH",
          isIntervention: false,
        },
        model: "claude-sonnet-4-5-20250514",
        systemPrompt: prompt.system,
        userMessages: prompt.messages,
        caseId: args.caseId,
      });
    } catch (err) {
      console.error(
        "Coach opening message failed for case",
        args.caseId,
        ":",
        err,
      );
      await ctx.runMutation(
        (internal as any).lib.streaming.insertStreamingMessage,
        {
          table: "jointMessages",
          caseId: args.caseId,
          authorType: "COACH",
          isIntervention: false,
          content:
            "Welcome to the joint session. I'm here to help facilitate your conversation.",
          status: "COMPLETE" as const,
          createdAt: Date.now(),
        },
      );
    }
  },
});

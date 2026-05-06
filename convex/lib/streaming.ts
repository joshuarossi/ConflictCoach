import type Anthropic from "@anthropic-ai/sdk";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import { runMockStreamWithDelay } from "./claudeMock";
import { getModelType } from "./costBudget";

// Resolve mutation references with optional chaining so the module is safe to
// import in test environments where `internal` is a stub/empty object.
/* eslint-disable @typescript-eslint/no-explicit-any */
const insertRef: any = (internal as any)?.lib?.streaming?.insertStreamingMessage;
const updateRef: any = (internal as any)?.lib?.streaming?.updateStreamingMessage;
const recordAiUsageRef: any = (internal as any)?.lib?.costBudget?.recordAiUsage;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionCtx = GenericActionCtx<GenericDataModel>;

/** Tables the streaming helper can write to. */
export type MessageTable =
  | "privateMessages"
  | "jointMessages"
  | "draftMessages";

export type MessageStatus = "STREAMING" | "COMPLETE" | "ERROR";

/** Single-object parameter for streamAIResponse. */
export interface StreamAIResponseOptions {
  /** Convex action context — provides runMutation. */
  ctx: ActionCtx;
  /**
   * Anthropic SDK client instance.
   * Created by the calling action via `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`.
   * Not used when CLAUDE_MOCK=true.
   */
  anthropicClient: Anthropic;
  /** Which message table to insert into. */
  table: MessageTable;
  /**
   * Table-specific fields for the initial insert.
   * Must include every required field *except* content, status, and createdAt
   * (those are set automatically).
   */
  messageFields: Record<string, unknown>;
  /** Claude model id, e.g. "claude-sonnet-4-5-20250514" */
  model: string;
  /** System prompt sent to Claude. */
  systemPrompt: string;
  /** Conversation history in Anthropic message format. */
  userMessages: Array<{ role: "user" | "assistant"; content: string }>;
  /** Max tokens for Claude response (default 4096). */
  maxTokens?: number;
  /** If provided, AI usage is recorded to this case's cost accumulator. */
  caseId?: string;
}

// ---------------------------------------------------------------------------
// Internal mutations — called from the streaming action via ctx.runMutation
// ---------------------------------------------------------------------------

/**
 * Fields the caller may pass through. Per-table schema validation still
 * happens at db.insert (Convex enforces the table validator there), so
 * we accept the full superset of message-table fields here. Anything
 * not declared on the target table will be rejected by Convex when the
 * insert runs.
 *
 * NOTE: this validator must list every field that any of privateMessages,
 * jointMessages, or draftMessages declares in convex/schema.ts. If a new
 * field is added to one of those tables, add it here too.
 */
const insertStreamingMessageArgs = {
  table: v.union(
    v.literal("privateMessages"),
    v.literal("jointMessages"),
    v.literal("draftMessages"),
  ),
  // Common
  content: v.string(),
  status: v.union(
    v.literal("STREAMING"),
    v.literal("COMPLETE"),
    v.literal("ERROR"),
  ),
  createdAt: v.number(),
  caseId: v.optional(v.id("cases")),
  // privateMessages
  userId: v.optional(v.id("users")),
  role: v.optional(v.union(v.literal("USER"), v.literal("AI"))),
  // jointMessages
  authorType: v.optional(v.union(v.literal("USER"), v.literal("COACH"))),
  authorUserId: v.optional(v.id("users")),
  isIntervention: v.optional(v.boolean()),
  replyToId: v.optional(v.id("jointMessages")),
  // draftMessages
  draftSessionId: v.optional(v.id("draftSessions")),
};

/** Insert a placeholder message row with status=STREAMING and empty content. */
export const insertStreamingMessage = internalMutation({
  args: insertStreamingMessageArgs,
  handler: async (ctx: any, args: any) => {
    const { table, ...fields } = args;
    if (table === "privateMessages") {
      return await ctx.db.insert("privateMessages", fields);
    } else if (table === "jointMessages") {
      return await ctx.db.insert("jointMessages", fields);
    } else {
      return await ctx.db.insert("draftMessages", fields);
    }
  },
});

/**
 * Caller-supplied fields that are used by streaming infrastructure (mock-mode
 * branching, logging, etc.) but are NOT persisted on the message row. Strip
 * these before forwarding to the insert mutation, otherwise Convex rejects
 * them as "extra fields not in the validator."
 *
 * Keep in sync with any new transient fields added to StreamAIResponseOptions
 * .messageFields.
 */
const TRANSIENT_MESSAGE_FIELDS = ["aiRole", "partyRole"] as const;

function stripTransientFields(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if ((TRANSIENT_MESSAGE_FIELDS as readonly string[]).includes(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Patch a message row with partial fields (content, status, tokens). */
export const updateStreamingMessage = internalMutation({
  args: {
    messageId: v.string(),
    content: v.string(),
    status: v.union(
      v.literal("STREAMING"),
      v.literal("COMPLETE"),
      v.literal("ERROR"),
    ),
    tokens: v.optional(v.number()),
  },
  handler: async (ctx: any, { messageId, content, status, tokens }: any) => {
    const patch: Record<string, unknown> = { content, status };
    if (tokens !== undefined) {
      patch.tokens = tokens;
    }
    await ctx.db.patch(messageId, patch);
  },
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_INTERVAL_MS = 50;
const TIMEOUT_MS = 30_000;
const RETRY_BACKOFF_MS = 2_000;
const CONTENT_FILTER_MESSAGE =
  "The coach is unable to respond to that message. Please try rephrasing your input.";

// ---------------------------------------------------------------------------
// Mock streaming (CLAUDE_MOCK=true — TechSpec §10.4)
// Delegated to convex/lib/claudeMock.ts for role-specific canned responses.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Core streaming helper
// ---------------------------------------------------------------------------

/**
 * Reusable helper that handles the full insert -> stream -> update -> complete
 * lifecycle for AI message generation.
 *
 * Must be called from a Convex action (which provides the ActionCtx).
 */
export async function streamAIResponse(
  options: StreamAIResponseOptions,
): Promise<string> {
  const {
    ctx,
    anthropicClient,
    table,
    messageFields,
    model,
    systemPrompt,
    userMessages,
    maxTokens = 4096,
    caseId,
  } = options;

  // 1. Insert placeholder message with status=STREAMING and empty content.
  // Strip transient fields (aiRole, partyRole) — these are used by streaming
  // infrastructure (mock-mode branching) but not persisted on message rows.
  const persistedFields = stripTransientFields(messageFields);
  const messageId: string = await ctx.runMutation(
    insertRef,
    {
      table,
      ...persistedFields,
      content: "",
      status: "STREAMING" as const,
      createdAt: Date.now(),
    },
  );

  // 2. Mock mode short-circuit (role-specific canned responses via claudeMock)
  if (process.env.CLAUDE_MOCK === "true") {
    // Infer AI role from messageFields if available, default to PRIVATE_COACH
    const role = (messageFields as Record<string, unknown>).aiRole as
      | "PRIVATE_COACH"
      | "SYNTHESIS"
      | "COACH"
      | "DRAFT_COACH"
      | undefined;
    await runMockStreamWithDelay(ctx, messageId, updateRef, { role });
    return messageId;
  }

  // 3. Real Claude API call with retry logic
  try {
    const tokenData = await callClaudeWithRetry(ctx, anthropicClient, {
      messageId,
      model,
      systemPrompt,
      userMessages,
      maxTokens,
    });

    // Record AI usage on the case cost accumulator if caseId provided
    if (caseId && recordAiUsageRef && tokenData) {
      try {
        await ctx.runMutation(recordAiUsageRef, {
          caseId,
          inputTokens: tokenData.inputTokens,
          outputTokens: tokenData.outputTokens,
          model: getModelType(model),
        });
      } catch (usageErr) {
        console.error("Failed to record AI usage:", usageErr);
      }
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown AI error";
    await ctx.runMutation(updateRef, {
      messageId,
      content: `Error: ${errorMessage}`,
      status: "ERROR" as const,
    });
  }

  return messageId;
}

// ---------------------------------------------------------------------------
// Claude API call with 429 retry
// ---------------------------------------------------------------------------

interface StreamParams {
  messageId: string;
  model: string;
  systemPrompt: string;
  userMessages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens: number;
}

interface TokenData {
  inputTokens: number;
  outputTokens: number;
}

async function callClaudeWithRetry(
  ctx: ActionCtx,
  client: Anthropic,
  params: StreamParams,
): Promise<TokenData> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await executeStream(ctx, client, params);
    } catch (error: unknown) {
      lastError = error;

      // Check for 429 rate limit — retry once with 2s backoff
      if (isRateLimitError(error) && attempt === 0) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS));
        continue;
      }

      // Content filter — set user-friendly message and mark ERROR
      if (isContentFilterStop(error)) {
        await ctx.runMutation(updateRef, {
          messageId: params.messageId,
          content: CONTENT_FILTER_MESSAGE,
          status: "ERROR" as const,
        });
        return { inputTokens: 0, outputTokens: 0 };
      }

      throw error;
    }
  }

  // Exhausted retries (two 429s)
  throw lastError;
}

// ---------------------------------------------------------------------------
// Stream execution with batched token flushing and timeout
// ---------------------------------------------------------------------------

/** Sentinel error thrown when content_filter stop reason is detected. */
class ContentFilterError extends Error {
  constructor() {
    super("content_filter");
    this.name = "ContentFilterError";
  }
}

async function executeStream(
  ctx: ActionCtx,
  client: Anthropic,
  params: StreamParams,
): Promise<TokenData> {
  const { messageId, model, systemPrompt, userMessages, maxTokens } = params;

  // Create the stream — may throw synchronously (e.g. API unreachable)
  const stream = client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: userMessages,
  });

  let buffer = "";
  let lastFlush = Date.now();
  let lastTokenTime = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let stopReason: string | null = null;

  // Use manual iterator for timeout support
  const iterator = (stream as AsyncIterable<any>)[Symbol.asyncIterator]();

  while (true) {
    // Race the next event against a timeout
    const remainingMs = TIMEOUT_MS - (Date.now() - lastTokenTime);
    if (remainingMs <= 0) {
      throw new Error("Network timeout: no tokens received for 30s");
    }

    const result = await Promise.race([
      iterator.next(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error("Network timeout: no tokens received for 30s"),
            ),
          remainingMs,
        ),
      ),
    ]);

    if (result.done) break;

    const event = result.value;

    if (
      event.type === "content_block_delta" &&
      event.delta?.type === "text_delta"
    ) {
      buffer += event.delta.text;
      lastTokenTime = Date.now();

      // Batch flush at ~50ms intervals
      const now = Date.now();
      if (now - lastFlush >= BATCH_INTERVAL_MS) {
        await ctx.runMutation(
          updateRef,
          {
            messageId,
            content: buffer,
            status: "STREAMING" as const,
          },
        );
        lastFlush = now;
      }
    } else if (event.type === "message_delta") {
      // Capture usage from the final delta event
      if (event.usage) {
        if (event.usage.input_tokens !== undefined) {
          inputTokens = event.usage.input_tokens;
        }
        if (event.usage.output_tokens !== undefined) {
          outputTokens = event.usage.output_tokens;
        }
      }
      if (event.delta?.stop_reason) {
        stopReason = event.delta.stop_reason;
      }
      lastTokenTime = Date.now();
    } else if (event.type === "message_start") {
      if (event.message?.usage) {
        inputTokens = event.message.usage.input_tokens ?? inputTokens;
        outputTokens = event.message.usage.output_tokens ?? outputTokens;
      }
      lastTokenTime = Date.now();
    } else {
      // Any event resets the timeout
      lastTokenTime = Date.now();
    }
  }

  // Check for content filter stop reason
  if (stopReason === "content_filter") {
    throw new ContentFilterError();
  }

  // Final flush — set status=COMPLETE with total token count
  const totalTokens = inputTokens + outputTokens;
  await ctx.runMutation(updateRef, {
    messageId,
    content: buffer,
    status: "COMPLETE" as const,
    tokens: totalTokens,
  });

  return { inputTokens, outputTokens };
}

// ---------------------------------------------------------------------------
// Error classification helpers
// ---------------------------------------------------------------------------

function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === "object") {
    if (
      "status" in error &&
      (error as Record<string, unknown>).status === 429
    ) {
      return true;
    }
    if (error instanceof Error && error.message.includes("429")) {
      return true;
    }
  }
  return false;
}

function isContentFilterStop(error: unknown): boolean {
  return error instanceof ContentFilterError;
}

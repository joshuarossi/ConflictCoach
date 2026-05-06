/* eslint-disable @typescript-eslint/no-explicit-any */
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { GenericActionCtx, GenericDataModel } from "convex/server";
import { writeAuditLog } from "./audit";

// ---------------------------------------------------------------------------
// Anthropic pricing constants (per token)
// Sonnet 4.5 and Haiku 4.5 rates as of 2025
// ---------------------------------------------------------------------------

/** Sonnet input price: $3 per 1M tokens */
export const SONNET_INPUT_RATE = 3 / 1_000_000;
/** Sonnet output price: $15 per 1M tokens */
export const SONNET_OUTPUT_RATE = 15 / 1_000_000;
/** Haiku input price: $0.80 per 1M tokens */
export const HAIKU_INPUT_RATE = 0.8 / 1_000_000;
/** Haiku output price: $4 per 1M tokens */
export const HAIKU_OUTPUT_RATE = 4 / 1_000_000;

// ---------------------------------------------------------------------------
// Budget caps
// ---------------------------------------------------------------------------

export const SOFT_CAP = 2.0;
export const HARD_CAP = 10.0;

export const SOFT_CAP_BOILERPLATE =
  "I'm limited right now — consider summarizing where you are and whether you've reached agreement";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BudgetStatus = "ok" | "soft_cap" | "hard_cap";

export interface AiUsage {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  /** Convenience alias for totalCostUsd */
  totalCost: number;
  softCapReachedAt?: number;
}

export const DEFAULT_AI_USAGE: AiUsage = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCostUsd: 0,
  totalCost: 0,
};

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Calculate the dollar cost for a given number of input/output tokens
 * using model-specific pricing.
 */
export function calculateCost(entry: {
  inputTokens: number;
  outputTokens: number;
  model: "sonnet" | "haiku";
}): number;
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: "sonnet" | "haiku",
): number;
export function calculateCost(
  inputTokensOrEntry:
    | number
    | { inputTokens: number; outputTokens: number; model: "sonnet" | "haiku" },
  outputTokens?: number,
  model?: "sonnet" | "haiku",
): number {
  const inTok =
    typeof inputTokensOrEntry === "number"
      ? inputTokensOrEntry
      : inputTokensOrEntry.inputTokens;
  const outTok =
    typeof inputTokensOrEntry === "number"
      ? outputTokens!
      : inputTokensOrEntry.outputTokens;
  const mdl =
    typeof inputTokensOrEntry === "number" ? model! : inputTokensOrEntry.model;
  const inputRate = mdl === "sonnet" ? SONNET_INPUT_RATE : HAIKU_INPUT_RATE;
  const outputRate = mdl === "sonnet" ? SONNET_OUTPUT_RATE : HAIKU_OUTPUT_RATE;
  return inTok * inputRate + outTok * outputRate;
}

/**
 * Accumulate token usage onto an AiUsage object.
 *
 * Supports two calling conventions:
 * 1. Single-entry: accumulateUsage(current, inputTokens, outputTokens, model)
 * 2. Batch: accumulateUsage(entries) where entries is an array of
 *    { inputTokens, outputTokens, model } objects
 */
export function accumulateUsage(
  entries: Array<{
    inputTokens: number;
    outputTokens: number;
    model: "sonnet" | "haiku";
  }>,
): AiUsage;
export function accumulateUsage(
  current: AiUsage,
  inputTokens: number,
  outputTokens: number,
  model: "sonnet" | "haiku",
): AiUsage;
export function accumulateUsage(
  currentOrEntries:
    | AiUsage
    | Array<{
        inputTokens: number;
        outputTokens: number;
        model: "sonnet" | "haiku";
      }>,
  inputTokens?: number,
  outputTokens?: number,
  model?: "sonnet" | "haiku",
): AiUsage {
  // Batch path: array of entries
  if (Array.isArray(currentOrEntries)) {
    let totalIn = 0;
    let totalOut = 0;
    let totalCost = 0;
    for (const entry of currentOrEntries) {
      totalIn += entry.inputTokens;
      totalOut += entry.outputTokens;
      totalCost += calculateCost(
        entry.inputTokens,
        entry.outputTokens,
        entry.model,
      );
    }
    return {
      totalInputTokens: totalIn,
      totalOutputTokens: totalOut,
      totalCostUsd: totalCost,
      totalCost: totalCost,
    };
  }

  // Single-entry path: accumulate onto existing usage
  const current = currentOrEntries;
  const cost = calculateCost(inputTokens!, outputTokens!, model!);
  const newCostUsd = current.totalCostUsd + cost;
  return {
    totalInputTokens: current.totalInputTokens + inputTokens!,
    totalOutputTokens: current.totalOutputTokens + outputTokens!,
    totalCostUsd: newCostUsd,
    totalCost: newCostUsd,
    softCapReachedAt: current.softCapReachedAt,
  };
}

/**
 * Determine the budget status given the current accumulated cost.
 *
 * When the soft cap is reached, classification actions (which use cheap
 * Haiku) are still allowed through — pass `{ actionType: "classification" }`
 * to signal this.
 */
export function checkCostBudget(
  currentCostUsd: number,
  options?: { actionType?: string },
): { status: BudgetStatus } {
  if (currentCostUsd >= HARD_CAP) return { status: "hard_cap" };
  if (currentCostUsd >= SOFT_CAP) {
    // Classification uses Haiku (extremely cheap) — allow through soft cap
    if (options?.actionType === "classification") {
      return { status: "ok" };
    }
    return { status: "soft_cap" };
  }
  return { status: "ok" };
}

/**
 * Derive "sonnet" or "haiku" from a full Anthropic model ID string.
 */
export function getModelType(modelId: string): "sonnet" | "haiku" {
  if (modelId.includes("haiku")) return "haiku";
  return "sonnet";
}

// ---------------------------------------------------------------------------
// Internal function references (resolved at load time, safe in test stubs)
// ---------------------------------------------------------------------------

const getCaseAiUsageRef: any = (internal as any)?.lib?.costBudget
  ?.getCaseAiUsageQuery;
const recordAiUsageRef: any = (internal as any)?.lib?.costBudget?.recordAiUsage;
const writeSoftCapAuditLogRef: any = (internal as any)?.lib?.costBudget
  ?.writeSoftCapAuditLog;

// ---------------------------------------------------------------------------
// Internal query — read accumulated AI usage for a case
// ---------------------------------------------------------------------------

/**
 * Read accumulated AI usage for a case. Callable directly with (ctx, args)
 * for admin tooling, and also registered as an internal Convex query.
 */
export async function getCaseAiUsage(
  ctx: any,
  args: { caseId: string },
): Promise<AiUsage | null> {
  const caseDoc = await ctx.db.get(args.caseId);
  if (!caseDoc) return null;
  return caseDoc.aiUsage ?? DEFAULT_AI_USAGE;
}

// Registered as internal Convex query for use via ctx.runQuery from actions
const getCaseAiUsageQuery = internalQuery({
  args: { caseId: v.id("cases") },
  handler: getCaseAiUsage,
});
// Re-export under original name for Convex runtime registration
export { getCaseAiUsageQuery };

// ---------------------------------------------------------------------------
// Internal mutation — accumulate token usage onto the case
// ---------------------------------------------------------------------------

export const recordAiUsage = internalMutation({
  args: {
    caseId: v.id("cases"),
    inputTokens: v.number(),
    outputTokens: v.number(),
    model: v.union(v.literal("sonnet"), v.literal("haiku")),
  },
  handler: async (
    ctx: any,
    args: {
      caseId: string;
      inputTokens: number;
      outputTokens: number;
      model: "sonnet" | "haiku";
    },
  ) => {
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc) return;

    const current: AiUsage = caseDoc.aiUsage ?? DEFAULT_AI_USAGE;
    const updated = accumulateUsage(
      current,
      args.inputTokens,
      args.outputTokens,
      args.model,
    );

    await ctx.db.patch(args.caseId, { aiUsage: updated });
  },
});

// ---------------------------------------------------------------------------
// Internal mutation — write COST_SOFT_CAP_REACHED audit log entry
// ---------------------------------------------------------------------------

export const writeSoftCapAuditLog = internalMutation({
  args: {
    caseId: v.id("cases"),
    action: v.optional(v.string()),
  },
  handler: async (ctx: any, args: { caseId: string; action?: string }) => {
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc) return;

    // Mark soft cap reached timestamp on the case
    const current: AiUsage = caseDoc.aiUsage ?? DEFAULT_AI_USAGE;
    if (!current.softCapReachedAt) {
      await ctx.db.patch(args.caseId, {
        aiUsage: { ...current, softCapReachedAt: Date.now() },
      });
    }

    // Write audit log entry — use initiator as actor since this is a system event
    await writeAuditLog(ctx, {
      actorUserId: String(caseDoc.initiatorUserId),
      action: args.action ?? "COST_SOFT_CAP_REACHED",
      targetType: "case",
      targetId: String(args.caseId),
      metadata: { currentCostUsd: String(current.totalCostUsd) },
    });
  },
});

// ---------------------------------------------------------------------------
// Action-level helper — enforce cost budget before an AI call
//
// Returns { allowed, status, boilerplate? }
//   - allowed=true:  proceed with AI call
//   - allowed=false: short-circuit; if boilerplate is set, insert it instead
// ---------------------------------------------------------------------------

type ActionCtx = GenericActionCtx<GenericDataModel>;

export async function enforceCostBudget(
  ctx: ActionCtx,
  caseIdOrOptions:
    | string
    | { caseId: string; currentCost?: number; actionType?: string },
): Promise<{
  allowed: boolean;
  status: BudgetStatus;
  boilerplate?: string;
}> {
  const caseId =
    typeof caseIdOrOptions === "string"
      ? caseIdOrOptions
      : caseIdOrOptions.caseId;
  const actionType =
    typeof caseIdOrOptions === "string"
      ? undefined
      : caseIdOrOptions.actionType;
  const providedCost =
    typeof caseIdOrOptions === "string"
      ? undefined
      : caseIdOrOptions.currentCost;

  let currentCost: number;
  let usage: AiUsage | null = null;

  if (providedCost !== undefined) {
    currentCost = providedCost;
  } else {
    usage = await ctx.runQuery(getCaseAiUsageRef, { caseId });
    currentCost = usage?.totalCostUsd ?? 0;
  }

  const { status } = checkCostBudget(currentCost, { actionType });

  if (status === "hard_cap") {
    return { allowed: false, status };
  }

  if (status === "soft_cap") {
    // Write audit log if this is the first time hitting soft cap
    if (!usage?.softCapReachedAt) {
      await ctx.runMutation(writeSoftCapAuditLogRef, {
        caseId,
        action: "COST_SOFT_CAP_REACHED",
      });
    }
    return { allowed: false, status, boilerplate: SOFT_CAP_BOILERPLATE };
  }

  return { allowed: true, status };
}

// ---------------------------------------------------------------------------
// Action-level helper — record AI usage after a call completes
// ---------------------------------------------------------------------------

export async function recordUsageFromAction(
  ctx: ActionCtx,
  caseId: string,
  inputTokens: number,
  outputTokens: number,
  model: "sonnet" | "haiku",
): Promise<void> {
  await ctx.runMutation(recordAiUsageRef, {
    caseId,
    inputTokens,
    outputTokens,
    model,
  });
}

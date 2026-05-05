/* eslint-disable @typescript-eslint/no-explicit-any */
import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { GenericActionCtx, GenericDataModel } from "convex/server";

// ---------------------------------------------------------------------------
// Anthropic pricing constants (per token)
// Sonnet 4.5 and Haiku 4.5 rates as of 2025
// ---------------------------------------------------------------------------

/** Sonnet input price: $3 per 1M tokens */
export const SONNET_INPUT_RATE = 3 / 1_000_000;
/** Sonnet output price: $15 per 1M tokens */
export const SONNET_OUTPUT_RATE = 15 / 1_000_000;
/** Haiku input price: $0.80 per 1M tokens */
export const HAIKU_INPUT_RATE = 0.80 / 1_000_000;
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
  softCapReachedAt?: number;
}

export const DEFAULT_AI_USAGE: AiUsage = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCostUsd: 0,
};

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

/**
 * Calculate the dollar cost for a given number of input/output tokens
 * using model-specific pricing.
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: "sonnet" | "haiku",
): number {
  const inputRate = model === "sonnet" ? SONNET_INPUT_RATE : HAIKU_INPUT_RATE;
  const outputRate = model === "sonnet" ? SONNET_OUTPUT_RATE : HAIKU_OUTPUT_RATE;
  return inputTokens * inputRate + outputTokens * outputRate;
}

/**
 * Return a new AiUsage object with the given tokens accumulated onto
 * the current usage.
 */
export function accumulateUsage(
  current: AiUsage,
  inputTokens: number,
  outputTokens: number,
  model: "sonnet" | "haiku",
): AiUsage {
  const cost = calculateCost(inputTokens, outputTokens, model);
  return {
    totalInputTokens: current.totalInputTokens + inputTokens,
    totalOutputTokens: current.totalOutputTokens + outputTokens,
    totalCostUsd: current.totalCostUsd + cost,
    softCapReachedAt: current.softCapReachedAt,
  };
}

/**
 * Determine the budget status given the current accumulated cost.
 */
export function checkCostBudget(currentCostUsd: number): BudgetStatus {
  if (currentCostUsd >= HARD_CAP) return "hard_cap";
  if (currentCostUsd >= SOFT_CAP) return "soft_cap";
  return "ok";
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

const getCaseAiUsageRef: any =
  (internal as any)?.lib?.costBudget?.getCaseAiUsage;
const recordAiUsageRef: any =
  (internal as any)?.lib?.costBudget?.recordAiUsage;
const writeSoftCapAuditLogRef: any =
  (internal as any)?.lib?.costBudget?.writeSoftCapAuditLog;

// ---------------------------------------------------------------------------
// Internal query — read accumulated AI usage for a case
// ---------------------------------------------------------------------------

export const getCaseAiUsage = internalQuery({
  args: { caseId: v.id("cases") },
  handler: async (ctx: any, args: { caseId: string }) => {
    const caseDoc = await ctx.db.get(args.caseId);
    if (!caseDoc) return null;
    return caseDoc.aiUsage ?? DEFAULT_AI_USAGE;
  },
});

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
  },
  handler: async (ctx: any, args: { caseId: string }) => {
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
    await ctx.db.insert("auditLog", {
      actorUserId: caseDoc.initiatorUserId,
      action: "COST_SOFT_CAP_REACHED",
      targetType: "case",
      targetId: args.caseId,
      metadata: { currentCostUsd: current.totalCostUsd },
      createdAt: Date.now(),
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
  caseId: string,
): Promise<{
  allowed: boolean;
  status: BudgetStatus;
  boilerplate?: string;
}> {
  const usage: AiUsage | null = await ctx.runQuery(getCaseAiUsageRef, {
    caseId,
  });
  const currentCost = usage?.totalCostUsd ?? 0;
  const status = checkCostBudget(currentCost);

  if (status === "hard_cap") {
    return { allowed: false, status };
  }

  if (status === "soft_cap") {
    // Write audit log if this is the first time hitting soft cap
    if (!usage?.softCapReachedAt) {
      await ctx.runMutation(writeSoftCapAuditLogRef, { caseId });
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

"use node";
/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../lib/auth";
import { throwAppError } from "../lib/errors";

const VALID_CATEGORIES = [
  "workplace",
  "family",
  "personal",
  "contractual",
  "other",
] as const;

/** Create a new conflict-coaching case, optionally in solo mode. */
export const create = mutation({
  args: {
    category: v.string(),
    mainTopic: v.string(),
    description: v.optional(v.string()),
    desiredOutcome: v.optional(v.string()),
    isSolo: v.optional(v.boolean()),
  },
  handler: async (ctx: any, args) => {
    const user = await requireAuth(ctx);

    // --- Input validation ---
    if (
      !VALID_CATEGORIES.includes(
        args.category as (typeof VALID_CATEGORIES)[number],
      )
    ) {
      throwAppError(
        "INVALID_INPUT",
        `Invalid category: ${args.category}. Must be one of: ${VALID_CATEGORIES.join(", ")}`,
      );
    }

    if (!args.mainTopic || args.mainTopic.trim() === "") {
      throwAppError("INVALID_INPUT", "mainTopic is required");
    }

    // --- Template pinning ---
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_category", (q: any) => q.eq("category", args.category))
      .collect();

    const template = templates.find((t: any) => !t.archivedAt);

    if (!template || !template.currentVersionId) {
      throwAppError(
        "NOT_FOUND",
        `No active template found for category: ${args.category}`,
      );
    }

    const templateVersionId = template.currentVersionId;

    const now = Date.now();
    const isSolo = args.isSolo === true;

    // --- Create case row ---
    const caseId = await ctx.db.insert("cases", {
      schemaVersion: 1 as const,
      status: isSolo ? "BOTH_PRIVATE_COACHING" : "DRAFT_PRIVATE_COACHING",
      isSolo,
      category: args.category,
      templateVersionId,
      initiatorUserId: user._id,
      inviteeUserId: isSolo ? user._id : undefined,
      createdAt: now,
      updatedAt: now,
    });

    // --- Create initiator partyState ---
    await ctx.db.insert("partyStates", {
      caseId,
      userId: user._id,
      role: "INITIATOR" as const,
      mainTopic: args.mainTopic,
      description: args.description,
      desiredOutcome: args.desiredOutcome,
    });

    // --- Solo mode: create invitee partyState, no invite token ---
    if (isSolo) {
      await ctx.db.insert("partyStates", {
        caseId,
        userId: user._id,
        role: "INVITEE" as const,
        mainTopic: args.mainTopic,
        description: args.description,
        desiredOutcome: args.desiredOutcome,
      });

      return { caseId };
    }

    // --- Normal mode: generate invite token ---
    const token = crypto.randomBytes(24).toString("base64url");

    await ctx.db.insert("inviteTokens", {
      caseId,
      token,
      status: "ACTIVE" as const,
      createdAt: now,
    });

    const siteUrl =
      process.env.SITE_URL ?? "https://conflictcoach.app";
    const inviteUrl = `${siteUrl}/invite/${token}`;

    return { caseId, inviteUrl };
  },
});

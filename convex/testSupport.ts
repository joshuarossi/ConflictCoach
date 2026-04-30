/**
 * Internal mutations used exclusively by E2E test fixtures to seed data.
 *
 * These are internal functions — they are NOT exposed to clients.
 * They bypass auth checks intentionally so that test fixtures can
 * create users, cases, and party states without going through the UI.
 *
 * Guarded by CLAUDE_MOCK env var: all handlers throw if CLAUDE_MOCK !== "true".
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

function requireTestMode() {
  if (process.env.CLAUDE_MOCK !== "true") {
    throw new Error("Test support mutations are only available when CLAUDE_MOCK=true");
  }
}

// ---------------------------------------------------------------------------
// createTestUser — seed a user directly into the users table
// ---------------------------------------------------------------------------

export const createTestUser = internalMutation({
  args: {
    email: v.string(),
    displayName: v.optional(v.string()),
    role: v.optional(v.union(v.literal("USER"), v.literal("ADMIN"))),
  },
  handler: async (ctx: any, args: { email: string; displayName?: string; role?: "USER" | "ADMIN" }) => {
    requireTestMode();
    const userId = await ctx.db.insert("users", {
      email: args.email,
      displayName: args.displayName ?? args.email.split("@")[0],
      role: args.role ?? "USER",
      createdAt: Date.now(),
    });
    return userId;
  },
});

// ---------------------------------------------------------------------------
// createTestCase — seed a case with a template version and party state
// ---------------------------------------------------------------------------

export const createTestCase = internalMutation({
  args: {
    initiatorUserId: v.id("users"),
    category: v.optional(v.string()),
    isSolo: v.optional(v.boolean()),
    status: v.optional(v.string()),
    mainTopic: v.optional(v.string()),
    description: v.optional(v.string()),
    desiredOutcome: v.optional(v.string()),
  },
  handler: async (
    ctx: any,
    args: {
      initiatorUserId: string;
      category?: string;
      isSolo?: boolean;
      status?: string;
      mainTopic?: string;
      description?: string;
      desiredOutcome?: string;
    },
  ) => {
    requireTestMode();

    // Create a minimal template + version for the case (required by schema)
    const templateId = await ctx.db.insert("templates", {
      category: args.category ?? "workplace",
      name: "Test Template",
      createdAt: Date.now(),
      createdByUserId: args.initiatorUserId,
    });

    const templateVersionId = await ctx.db.insert("templateVersions", {
      templateId,
      version: 1,
      globalGuidance: "Test guidance",
      publishedAt: Date.now(),
      publishedByUserId: args.initiatorUserId,
    });

    await ctx.db.patch(templateId, { currentVersionId: templateVersionId });

    // Create the case
    const now = Date.now();
    const caseId = await ctx.db.insert("cases", {
      schemaVersion: 1 as const,
      status: (args.status ?? "DRAFT_PRIVATE_COACHING") as any,
      isSolo: args.isSolo ?? false,
      category: args.category ?? "workplace",
      templateVersionId,
      initiatorUserId: args.initiatorUserId,
      createdAt: now,
      updatedAt: now,
    });

    // Create the initiator's party state
    await ctx.db.insert("partyStates", {
      caseId,
      userId: args.initiatorUserId,
      role: "INITIATOR" as const,
      mainTopic: args.mainTopic ?? "Test conflict topic",
      description: args.description ?? "Test conflict description",
      desiredOutcome: args.desiredOutcome ?? "Resolve the conflict amicably",
      formCompletedAt: now,
    });

    return caseId;
  },
});

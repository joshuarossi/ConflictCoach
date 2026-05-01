/**
 * Test-support mutations — only active when CLAUDE_MOCK=true.
 *
 * Provides direct data seeding for E2E test fixtures (WOR-71).
 * All mutations guard on CLAUDE_MOCK=true and throw in production.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function assertTestMode(): void {
  if (process.env.CLAUDE_MOCK !== "true") {
    throw new Error(
      "Test support functions are only available when CLAUDE_MOCK=true",
    );
  }
}

// ---------------------------------------------------------------------------
// getUserByEmail — look up a user by email for fixture wiring
// ---------------------------------------------------------------------------

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx: any, args: { email: string }) => {
    assertTestMode();
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();
  },
});

// ---------------------------------------------------------------------------
// createCase — insert a case directly for E2E tests
// ---------------------------------------------------------------------------

export const createCase = mutation({
  args: {
    initiatorUserId: v.id("users"),
    category: v.optional(v.string()),
    isSolo: v.optional(v.boolean()),
  },
  handler: async (
    ctx: any,
    args: { initiatorUserId: string; category?: string; isSolo?: boolean },
  ) => {
    assertTestMode();

    const category = args.category ?? "workplace";

    // Create a minimal template + version for the test case
    const templateId = await ctx.db.insert("templates", {
      category,
      name: "Test Template",
      createdAt: Date.now(),
      createdByUserId: args.initiatorUserId,
    });

    const templateVersionId = await ctx.db.insert("templateVersions", {
      templateId,
      version: 1,
      globalGuidance: "Test guidance for conflict coaching.",
      publishedAt: Date.now(),
      publishedByUserId: args.initiatorUserId,
    });

    await ctx.db.patch(templateId, { currentVersionId: templateVersionId });

    const now = Date.now();
    const caseId = await ctx.db.insert("cases", {
      schemaVersion: 1 as const,
      status: "DRAFT_PRIVATE_COACHING" as const,
      isSolo: args.isSolo ?? true,
      category,
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
    });

    return caseId;
  },
});

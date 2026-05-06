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

    const initiator: any = await ctx.db.get(args.initiatorUserId);
    const templateVersionId = await ctx.db.insert("templateVersions", {
      templateId,
      version: 1,
      globalGuidance: "Test guidance for conflict coaching.",
      publishedAt: Date.now(),
      publishedByUserId: args.initiatorUserId,
      publishedByName: initiator?.displayName || initiator?.email || "Unknown",
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

// ---------------------------------------------------------------------------
// setCaseStatus — directly set a case's status for E2E lifecycle testing
// ---------------------------------------------------------------------------

export const setCaseStatus = mutation({
  args: {
    caseId: v.id("cases"),
    status: v.string(),
  },
  handler: async (
    ctx: any,
    args: { caseId: string; status: string },
  ) => {
    assertTestMode();
    await ctx.db.patch(args.caseId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// createInviteToken �� create an invite token for a case (E2E fixture)
// ---------------------------------------------------------------------------

export const createInviteToken = mutation({
  args: {
    caseId: v.id("cases"),
  },
  handler: async (ctx: any, args: { caseId: string }) => {
    assertTestMode();

    const tokenBytes = new Uint8Array(24);
    crypto.getRandomValues(tokenBytes);
    const token = btoa(String.fromCharCode(...tokenBytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    await ctx.db.insert("inviteTokens", {
      caseId: args.caseId,
      token,
      status: "ACTIVE" as const,
      createdAt: Date.now(),
    });

    return token;
  },
});

// ---------------------------------------------------------------------------
// addPartyState — add a party state row for a user on a case (E2E fixture)
// ---------------------------------------------------------------------------

export const addPartyState = mutation({
  args: {
    caseId: v.id("cases"),
    userId: v.id("users"),
    role: v.string(),
  },
  handler: async (
    ctx: any,
    args: { caseId: string; userId: string; role: string },
  ) => {
    assertTestMode();
    await ctx.db.insert("partyStates", {
      caseId: args.caseId,
      userId: args.userId,
      role: args.role,
    });
  },
});

// ---------------------------------------------------------------------------
// createCaseForEmail — fixture-friendly variant that resolves email → userId
// before delegating to the same insert path. Lets browser fixtures avoid
// shipping the user's _id around (they only ever know the email).
// ---------------------------------------------------------------------------

export const createCaseForEmail = mutation({
  args: {
    email: v.string(),
    category: v.optional(v.string()),
    isSolo: v.optional(v.boolean()),
  },
  handler: async (
    ctx: any,
    args: { email: string; category?: string; isSolo?: boolean },
  ) => {
    assertTestMode();

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();
    if (!user) {
      throw new Error(`Test fixture user not found for email: ${args.email}`);
    }

    const category = args.category ?? "workplace";
    const templateId = await ctx.db.insert("templates", {
      category,
      name: "Test Template",
      createdAt: Date.now(),
      createdByUserId: user._id,
    });
    const templateVersionId = await ctx.db.insert("templateVersions", {
      templateId,
      version: 1,
      globalGuidance: "Test guidance for conflict coaching.",
      publishedAt: Date.now(),
      publishedByUserId: user._id,
      publishedByName: user.displayName || user.email || "Unknown",
    });
    await ctx.db.patch(templateId, { currentVersionId: templateVersionId });

    const now = Date.now();
    const caseId = await ctx.db.insert("cases", {
      schemaVersion: 1 as const,
      status: "DRAFT_PRIVATE_COACHING" as const,
      isSolo: args.isSolo ?? true,
      category,
      templateVersionId,
      initiatorUserId: user._id,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("partyStates", {
      caseId,
      userId: user._id,
      role: "INITIATOR" as const,
    });

    return caseId;
  },
});

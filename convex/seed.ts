/* eslint-disable @typescript-eslint/no-explicit-any */
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Seed data constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "admin@conflictcoach.dev";

const TEMPLATE_SEEDS = [
  {
    category: "workplace",
    name: "Workplace Conflict",
    globalGuidance:
      "Focus on professional communication norms and workplace boundaries. " +
      "Encourage parties to separate personal feelings from professional obligations. " +
      "Aim for solutions that respect organizational hierarchy while addressing underlying concerns.",
  },
  {
    category: "family",
    name: "Family Conflict",
    globalGuidance:
      "Prioritize emotional safety and long-term relationship preservation. " +
      "Acknowledge that family dynamics carry deep history and strong emotions. " +
      "Guide parties toward empathy and understanding rather than winning arguments.",
  },
  {
    category: "personal",
    name: "Personal Conflict",
    globalGuidance:
      "Help parties articulate their needs and boundaries clearly. " +
      "Encourage self-reflection on personal triggers and communication patterns. " +
      "Support finding mutually respectful resolutions that honor each person's autonomy.",
  },
];

// ---------------------------------------------------------------------------
// Internal queries & mutations (used by the seed action)
// ---------------------------------------------------------------------------

export const _getAdminByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx: any, args: { email: string }) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();
  },
});

export const _createAdminUser = internalMutation({
  args: { email: v.string() },
  handler: async (ctx: any, args: { email: string }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      email: args.email,
      role: "ADMIN",
      createdAt: Date.now(),
    });
  },
});

export const _getTemplateByCategory = internalQuery({
  args: { category: v.string() },
  handler: async (ctx: any, args: { category: string }) => {
    return await ctx.db
      .query("templates")
      .withIndex("by_category", (q: any) => q.eq("category", args.category))
      .first();
  },
});

export const _createTemplateWithVersion = internalMutation({
  args: {
    category: v.string(),
    name: v.string(),
    globalGuidance: v.string(),
    createdByUserId: v.string(),
  },
  handler: async (
    ctx: any,
    args: {
      category: string;
      name: string;
      globalGuidance: string;
      createdByUserId: string;
    },
  ) => {
    // Idempotency check inside the mutation as well
    const existing = await ctx.db
      .query("templates")
      .withIndex("by_category", (q: any) => q.eq("category", args.category))
      .first();
    if (existing) return existing._id;

    const now = Date.now();

    const templateId = await ctx.db.insert("templates", {
      category: args.category,
      name: args.name,
      createdAt: now,
      createdByUserId: args.createdByUserId,
    });

    const versionId = await ctx.db.insert("templateVersions", {
      templateId,
      version: 1,
      globalGuidance: args.globalGuidance,
      publishedAt: now,
      publishedByUserId: args.createdByUserId,
    });

    await ctx.db.patch(templateId, { currentVersionId: versionId });

    return templateId;
  },
});

// ---------------------------------------------------------------------------
// seed — public action callable from the Convex dashboard
// ---------------------------------------------------------------------------

export const seed = action({
  args: {},
  handler: async (ctx: any) => {
    // Guard: only allow in development or when CLAUDE_MOCK is true
    const nodeEnv = process.env.NODE_ENV;
    const claudeMock = process.env.CLAUDE_MOCK;
    if (nodeEnv !== "development" && claudeMock !== "true") {
      throw new Error(
        "Seed script can only run in development (NODE_ENV=development or CLAUDE_MOCK=true)",
      );
    }

    // 1. Ensure admin user exists
    const adminUserId = await ctx.runMutation(internal.seed._createAdminUser, {
      email: ADMIN_EMAIL,
    });

    // 2. Create default templates (idempotent)
    for (const tmpl of TEMPLATE_SEEDS) {
      await ctx.runMutation(internal.seed._createTemplateWithVersion, {
        category: tmpl.category,
        name: tmpl.name,
        globalGuidance: tmpl.globalGuidance,
        createdByUserId: adminUserId,
      });
    }

    return { success: true, adminUserId };
  },
});

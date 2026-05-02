/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation } from "./_generated/server";

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
// seed — callable from the Convex dashboard
// ---------------------------------------------------------------------------

export const seed = mutation({
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

    // 1. Ensure admin user exists (idempotent)
    let adminUserId: any;
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", ADMIN_EMAIL))
      .first();

    if (existingAdmin) {
      adminUserId = existingAdmin._id;
    } else {
      adminUserId = await ctx.db.insert("users", {
        email: ADMIN_EMAIL,
        role: "ADMIN" as const,
        createdAt: Date.now(),
      });
    }

    // 2. Create default templates with initial versions (idempotent)
    for (const tmpl of TEMPLATE_SEEDS) {
      const existingTemplate = await ctx.db
        .query("templates")
        .withIndex("by_category", (q: any) =>
          q.eq("category", tmpl.category),
        )
        .first();

      if (existingTemplate) continue;

      const now = Date.now();

      const templateId = await ctx.db.insert("templates", {
        category: tmpl.category,
        name: tmpl.name,
        createdAt: now,
        createdByUserId: adminUserId,
      });

      const versionId = await ctx.db.insert("templateVersions", {
        templateId,
        version: 1,
        globalGuidance: tmpl.globalGuidance,
        publishedAt: now,
        publishedByUserId: adminUserId,
      });

      await ctx.db.patch(templateId, { currentVersionId: versionId });
    }

    return { success: true, adminUserId };
  },
});

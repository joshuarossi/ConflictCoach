/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation } from "./_generated/server";
import { requireAuth, isAdmin } from "./lib/auth";
import { throwAppError } from "./lib/errors";

// ---------------------------------------------------------------------------
// Seed data constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "admin@conflictcoach.dev";

// One template per VALID_CATEGORIES entry in convex/cases/create.ts.
// Adding a new category there REQUIRES adding a row here, otherwise
// case creation will fail with NOT_FOUND for that category.
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
  {
    category: "contractual",
    name: "Contractual Conflict",
    globalGuidance:
      "Help parties separate the contract terms from their emotional response to a perceived breach. " +
      "Encourage clarity about which obligations are in dispute, what each party considered the agreement to mean, and what evidence each side has. " +
      "Aim for resolutions that restore trust and a workable path forward, not just legal vindication.",
  },
  {
    category: "other",
    name: "General Conflict",
    globalGuidance:
      "Apply general conflict-mediation principles: name the underlying need behind each position, separate the person from the problem, and look for solutions that address shared interests. " +
      "Be especially careful not to assume the conflict's category — let each party describe the situation in their own terms before guiding toward resolution.",
  },
];

/**
 * Shared core: idempotently creates the admin user (if missing) and one
 * template + version per TEMPLATE_SEEDS row. Returns the admin userId
 * and the count of templates inserted (0 if all already existed).
 *
 * Used by both:
 *   - seed() (dev-only, called from CLI / Convex dashboard in dev)
 *   - setupTemplates() (prod-safe, admin-gated, callable from any deployment)
 */
async function applyTemplateSeeds(ctx: any): Promise<{
  adminUserId: any;
  inserted: number;
}> {
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

  // 2. Insert any missing templates (idempotent on the (category) unique key)
  let inserted = 0;
  for (const tmpl of TEMPLATE_SEEDS) {
    const existingTemplate = await ctx.db
      .query("templates")
      .withIndex("by_category", (q: any) => q.eq("category", tmpl.category))
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
    inserted++;
  }

  return { adminUserId, inserted };
}

// ---------------------------------------------------------------------------
// seed — dev/test-only bootstrap. Creates an unauthenticated admin row
// and seeds templates. Refuses to run in environments where we can't
// guarantee dev/test status, because it side-steps auth.
//
// For prod, use setupTemplates below — it requires admin authentication
// rather than relying on env variables.
// ---------------------------------------------------------------------------

export const seed = mutation({
  args: {},
  handler: async (ctx: any) => {
    const nodeEnv = process.env.NODE_ENV;
    const claudeMock = process.env.CLAUDE_MOCK;
    if (nodeEnv !== "development" && claudeMock !== "true") {
      throw new Error(
        "Seed script can only run in development (NODE_ENV=development " +
          "or CLAUDE_MOCK=true). For prod, use setupTemplates which " +
          "requires admin authentication instead.",
      );
    }

    const { adminUserId, inserted } = await applyTemplateSeeds(ctx);
    return { success: true, adminUserId, templatesInserted: inserted };
  },
});

// ---------------------------------------------------------------------------
// claimFirstAdmin — prod-safe one-time bootstrap. The first authenticated
// user to call this becomes role: "ADMIN", but ONLY if no admin currently
// exists in the database. After that, this mutation refuses to run.
//
// Why this exists: prod databases start empty. Real users get role: "USER"
// when they sign in (via auth/users upsert). There's no UI flow to grant
// admin, and the seed mutation creates a ghost admin@conflictcoach.dev
// user that nobody can sign in as (no auth identity attached). This
// mutation closes the gap by letting the first signed-in caller claim
// admin on a fresh DB.
//
// Idempotency / safety:
//   - If any admin exists already, throws CONFLICT — won't quietly grant
//     a second admin via this path.
//   - If the caller is already admin, returns success without changing
//     anything (defensive).
// ---------------------------------------------------------------------------

export const claimFirstAdmin = mutation({
  args: {},
  handler: async (ctx: any) => {
    const user = await requireAuth(ctx);

    // If any admin already exists, refuse. New admins must be promoted by
    // an existing admin (not yet implemented; for now use the Convex
    // dashboard table editor).
    const existingAdmin = await ctx.db
      .query("users")
      .filter((q: any) => q.eq(q.field("role"), "ADMIN"))
      .first();

    if (existingAdmin && existingAdmin._id !== user._id) {
      throwAppError(
        "CONFLICT",
        "An admin user already exists. Promote new admins via the existing admin or the Convex dashboard.",
      );
    }

    // Caller is already admin — no-op success.
    if (user.role === "ADMIN") {
      return {
        success: true,
        userId: user._id,
        message: "You are already an admin.",
      };
    }

    // Promote the caller to ADMIN.
    await ctx.db.patch(user._id, { role: "ADMIN" as const });

    return {
      success: true,
      userId: user._id,
      message:
        "You are now an admin. Next: call setupTemplates to seed the default conflict templates.",
    };
  },
});

// ---------------------------------------------------------------------------
// setupTemplates — prod-safe. Idempotent template initialization for any
// environment (dev or prod). Gated on admin auth instead of env variables.
//
// Use cases:
//   1. First-time prod bootstrap: an admin signs in (manually upserted via
//      the Convex dashboard), then calls this from the dashboard or the
//      admin UI to populate the five default templates.
//   2. After adding a new VALID_CATEGORIES entry to convex/cases/create.ts,
//      add a row to TEMPLATE_SEEDS and call this — it will only insert the
//      missing template(s).
//
// Authentication: caller must be a logged-in user with role === "ADMIN".
// The auth check happens BEFORE any DB writes; non-admin callers see
// "FORBIDDEN" and the database is unmodified.
//
// Idempotency: existing templates are detected by the (category) unique key
// and skipped. Safe to call repeatedly.
// ---------------------------------------------------------------------------

export const setupTemplates = mutation({
  args: {},
  handler: async (ctx: any) => {
    const user = await requireAuth(ctx);
    if (!isAdmin(user)) {
      throwAppError("FORBIDDEN", "Admin access required");
    }

    const { inserted } = await applyTemplateSeeds(ctx);
    return {
      success: true,
      templatesInserted: inserted,
      message:
        inserted === 0
          ? "All template categories already exist; nothing to insert."
          : `Inserted ${inserted} new template(s).`,
    };
  },
});

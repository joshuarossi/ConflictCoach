/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { throwAppError } from "./lib/errors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireAdmin(user: { role: string }) {
  if (user.role !== "ADMIN") {
    throwAppError("FORBIDDEN", "Admin access required");
  }
}

async function writeAuditLog(
  ctx: any,
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, unknown>,
) {
  await ctx.db.insert("auditLog", {
    actorUserId,
    action,
    targetType,
    targetId,
    metadata: metadata ?? undefined,
    createdAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// admin/templates/create
// ---------------------------------------------------------------------------

export const createTemplate = mutation({
  args: {
    category: v.string(),
    name: v.string(),
    globalGuidance: v.string(),
    coachInstructions: v.optional(v.string()),
    draftCoachInstructions: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const user = await requireAuth(ctx);
    requireAdmin(user);

    const now = Date.now();

    // Create the template row
    const templateId = await ctx.db.insert("templates", {
      category: args.category,
      name: args.name,
      createdAt: now,
      createdByUserId: user._id,
    });

    // Create the initial version (version 1)
    const versionId = await ctx.db.insert("templateVersions", {
      templateId,
      version: 1,
      globalGuidance: args.globalGuidance,
      coachInstructions: args.coachInstructions,
      draftCoachInstructions: args.draftCoachInstructions,
      publishedAt: now,
      publishedByUserId: user._id,
    });

    // Update template to point to the initial version
    await ctx.db.patch(templateId, { currentVersionId: versionId });

    // Audit log
    await writeAuditLog(ctx, user._id, "TEMPLATE_CREATED", "template", templateId);

    return templateId;
  },
});

// ---------------------------------------------------------------------------
// admin/templates/publishNewVersion
// ---------------------------------------------------------------------------

export const publishNewVersion = mutation({
  args: {
    templateId: v.id("templates"),
    globalGuidance: v.string(),
    coachInstructions: v.optional(v.string()),
    draftCoachInstructions: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const user = await requireAuth(ctx);
    requireAdmin(user);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throwAppError("NOT_FOUND", "Template not found");
    }

    // Determine the next version number by finding the max existing version
    const existingVersions = await ctx.db
      .query("templateVersions")
      .withIndex("by_template", (q: any) => q.eq("templateId", args.templateId))
      .collect();

    const maxVersion = existingVersions.reduce(
      (max: number, v: any) => Math.max(max, v.version),
      0,
    );
    const nextVersion = maxVersion + 1;

    const now = Date.now();

    // Create the new immutable version row
    const versionId = await ctx.db.insert("templateVersions", {
      templateId: args.templateId,
      version: nextVersion,
      globalGuidance: args.globalGuidance,
      coachInstructions: args.coachInstructions,
      draftCoachInstructions: args.draftCoachInstructions,
      publishedAt: now,
      publishedByUserId: user._id,
      notes: args.notes,
    });

    // Update the template's current version pointer
    await ctx.db.patch(args.templateId, { currentVersionId: versionId });

    // Audit log
    await writeAuditLog(
      ctx,
      user._id,
      "TEMPLATE_PUBLISHED",
      "templateVersion",
      versionId,
      { templateId: args.templateId, version: nextVersion },
    );

    return versionId;
  },
});

// ---------------------------------------------------------------------------
// admin/templates/archive
// ---------------------------------------------------------------------------

export const archiveTemplate = mutation({
  args: {
    templateId: v.id("templates"),
  },
  handler: async (ctx: any, args: any) => {
    const user = await requireAuth(ctx);
    requireAdmin(user);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throwAppError("NOT_FOUND", "Template not found");
    }

    const now = Date.now();
    await ctx.db.patch(args.templateId, { archivedAt: now });

    // Audit log
    await writeAuditLog(ctx, user._id, "TEMPLATE_ARCHIVED", "template", args.templateId);
  },
});

// ---------------------------------------------------------------------------
// admin/templates/listAll — returns all templates including archived
// ---------------------------------------------------------------------------

export const listAllTemplates = query({
  args: {},
  handler: async (ctx: any) => {
    const user = await requireAuth(ctx);
    requireAdmin(user);

    const templates = await ctx.db.query("templates").collect();
    return templates;
  },
});

// ---------------------------------------------------------------------------
// admin/templateVersions/list — all versions for a template, ordered by
// version descending
// ---------------------------------------------------------------------------

export const listTemplateVersions = query({
  args: {
    templateId: v.id("templates"),
  },
  handler: async (ctx: any, args: any) => {
    const user = await requireAuth(ctx);
    requireAdmin(user);

    const versions = await ctx.db
      .query("templateVersions")
      .withIndex("by_template", (q: any) => q.eq("templateId", args.templateId))
      .collect();

    // Sort by version descending
    versions.sort((a: any, b: any) => b.version - a.version);

    return versions;
  },
});

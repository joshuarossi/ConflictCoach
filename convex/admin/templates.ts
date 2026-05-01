/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, isAdmin } from "../lib/auth";
import { throwAppError } from "../lib/errors";
import { writeAuditLog } from "../lib/audit";
import { AUDIT_ACTIONS } from "../lib/audit";

// ---------------------------------------------------------------------------
// createTemplate — admin-only: create a new template
// ---------------------------------------------------------------------------

export async function createTemplateHandler(ctx: any, args: any) {
  const user = await requireAuth(ctx);
  if (!isAdmin(user)) {
    throwAppError("FORBIDDEN", "Admin access required");
  }

  const now = Date.now();

  // Create the template
  const templateId = await ctx.db.insert("templates", {
    category: args.category,
    name: args.name,
    createdAt: now,
    createdByUserId: user._id,
  });

  // Create the initial version
  const versionId = await ctx.db.insert("templateVersions", {
    templateId,
    version: 1,
    globalGuidance: args.globalGuidance,
    coachInstructions: args.coachInstructions,
    draftCoachInstructions: args.draftCoachInstructions,
    publishedAt: now,
    publishedByUserId: user._id,
    notes: args.notes,
  });

  // Set the current version on the template
  await ctx.db.patch(templateId, { currentVersionId: versionId });

  // Audit log
  await writeAuditLog(ctx, {
    actorUserId: user._id,
    action: AUDIT_ACTIONS.TEMPLATE_CREATED,
    targetType: "template",
    targetId: templateId,
    metadata: { category: args.category, name: args.name },
  });

  return templateId;
}

export const create = mutation({
  args: {
    category: v.string(),
    name: v.string(),
    globalGuidance: v.string(),
    coachInstructions: v.optional(v.string()),
    draftCoachInstructions: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: createTemplateHandler,
});

// ---------------------------------------------------------------------------
// publishVersion — admin-only: publish a new version for an existing template
// ---------------------------------------------------------------------------

export async function publishVersionHandler(ctx: any, args: any) {
  const user = await requireAuth(ctx);
  if (!isAdmin(user)) {
    throwAppError("FORBIDDEN", "Admin access required");
  }

  const template = await ctx.db.get(args.templateId);
  if (!template) {
    throwAppError("NOT_FOUND", "Template not found");
  }

  if (template.archivedAt) {
    throwAppError("CONFLICT", "Cannot publish a version for an archived template");
  }

  // Determine the next version number
  const existingVersions = await ctx.db
    .query("templateVersions")
    .withIndex("by_template", (q: any) => q.eq("templateId", args.templateId))
    .collect();
  const nextVersion = existingVersions.length + 1;

  const now = Date.now();

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

  await ctx.db.patch(args.templateId, { currentVersionId: versionId });

  // Audit log
  await writeAuditLog(ctx, {
    actorUserId: user._id,
    action: AUDIT_ACTIONS.TEMPLATE_PUBLISHED,
    targetType: "templateVersion",
    targetId: versionId,
    metadata: { templateId: args.templateId, version: nextVersion },
  });

  return versionId;
}

export const publishVersion = mutation({
  args: {
    templateId: v.id("templates"),
    globalGuidance: v.string(),
    coachInstructions: v.optional(v.string()),
    draftCoachInstructions: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: publishVersionHandler,
});

// ---------------------------------------------------------------------------
// archive — admin-only: archive a template
// ---------------------------------------------------------------------------

export async function archiveTemplateHandler(ctx: any, args: any) {
  const user = await requireAuth(ctx);
  if (!isAdmin(user)) {
    throwAppError("FORBIDDEN", "Admin access required");
  }

  const template = await ctx.db.get(args.templateId);
  if (!template) {
    throwAppError("NOT_FOUND", "Template not found");
  }

  if (template.archivedAt) {
    throwAppError("CONFLICT", "Template is already archived");
  }

  const now = Date.now();
  await ctx.db.patch(args.templateId, { archivedAt: now });

  // Audit log
  await writeAuditLog(ctx, {
    actorUserId: user._id,
    action: AUDIT_ACTIONS.TEMPLATE_ARCHIVED,
    targetType: "template",
    targetId: args.templateId,
    metadata: { name: template.name, category: template.category },
  });
}

export const archive = mutation({
  args: {
    templateId: v.id("templates"),
  },
  handler: archiveTemplateHandler,
});

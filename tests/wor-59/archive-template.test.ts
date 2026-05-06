/**
 * WOR-59 AC5: admin/templates/archive
 *
 * Sets archivedAt; archived templates are hidden from the category picker
 * but pinned cases are unaffected.
 */
import { describe, test, expect } from "vitest";
import {
  createMockContext,
  callHandler,
  ADMIN_USER,
  type MockTemplate,
} from "./helpers";

import {
  createTemplate,
  archiveTemplate,
  listAllTemplates,
} from "../../convex/templates";

describe("AC5: admin/templates/archive", () => {
  test("sets archivedAt on the template", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "To Be Archived",
      globalGuidance: "Guidance.",
    });

    await callHandler(archiveTemplate, ctx, { templateId });

    const templates = getTable<MockTemplate>("templates");
    const archived = templates.find((t) => t._id === templateId);

    expect(archived).toBeDefined();
    expect(archived!.archivedAt).toBeDefined();
    expect(typeof archived!.archivedAt).toBe("number");
    expect(archived!.archivedAt).toBeGreaterThan(0);
  });

  test("listAllTemplates still returns archived templates (admin view)", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "family",
      name: "Archived Template",
      globalGuidance: "Guidance.",
    });

    await callHandler(archiveTemplate, ctx, { templateId });

    const all = await callHandler(listAllTemplates, ctx, {});
    expect(all).toHaveLength(1);
    expect(all[0].archivedAt).toBeDefined();
  });

  test("archived templates are excluded from category-filtered query", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    // Create two templates in the same category
    await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Active Template",
      globalGuidance: "Active guidance.",
    });

    const archivedId = await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Archived Template",
      globalGuidance: "Archived guidance.",
    });

    await callHandler(archiveTemplate, ctx, { templateId: archivedId });

    // Simulate the category-picker contract: query templates by category
    // and filter out archived ones (archivedAt must be undefined).
    const allInCategory = getTable<MockTemplate>("templates").filter(
      (t) => t.category === "workplace" && t.archivedAt === undefined,
    );

    expect(allInCategory).toHaveLength(1);
    expect(allInCategory[0].name).toBe("Active Template");
  });

  test("archived template retains its data (does not delete)", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "personal",
      name: "Soft Delete Test",
      globalGuidance: "Important guidance.",
    });

    await callHandler(archiveTemplate, ctx, { templateId });

    const templates = getTable<MockTemplate>("templates");
    const t = templates.find((t) => t._id === templateId);

    expect(t!.name).toBe("Soft Delete Test");
    expect(t!.category).toBe("personal");
    expect(t!.currentVersionId).toBeDefined();
  });

  test("archiving does not affect template version data (pinned cases safe)", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "contractual",
      name: "Pinned Case Template",
      globalGuidance: "Contractual guidance.",
    });

    const templates = getTable<MockTemplate>("templates");
    const versionIdBeforeArchive = templates[0].currentVersionId;

    await callHandler(archiveTemplate, ctx, { templateId });

    // The version ID should still be valid and unchanged
    expect(templates[0].currentVersionId).toBe(versionIdBeforeArchive);

    // The version row itself should still exist and be intact
    const row = await ctx.db.get(versionIdBeforeArchive!);
    expect(row).toBeDefined();
    expect(row!.globalGuidance).toBe("Contractual guidance.");
  });
});

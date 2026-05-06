/**
 * WOR-59 AC6: admin/templates/listAll
 *
 * Returns all templates including archived (admin view).
 */
import { describe, test, expect } from "vitest";
import { createMockContext, callHandler, ADMIN_USER } from "./helpers";

import {
  createTemplate,
  archiveTemplate,
  listAllTemplates,
} from "../../convex/templates";

describe("AC6: admin/templates/listAll", () => {
  test("returns all templates when none are archived", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Template A",
      globalGuidance: "Guidance A.",
    });
    await callHandler(createTemplate, ctx, {
      category: "family",
      name: "Template B",
      globalGuidance: "Guidance B.",
    });

    const all = await callHandler(listAllTemplates, ctx, {});
    expect(all).toHaveLength(2);
  });

  test("returns 2 active + 1 archived template (all 3)", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Active 1",
      globalGuidance: "G1.",
    });
    await callHandler(createTemplate, ctx, {
      category: "family",
      name: "Active 2",
      globalGuidance: "G2.",
    });
    const archivedId = await callHandler(createTemplate, ctx, {
      category: "personal",
      name: "Archived One",
      globalGuidance: "G3.",
    });

    await callHandler(archiveTemplate, ctx, { templateId: archivedId });

    const all = await callHandler(listAllTemplates, ctx, {});
    expect(all).toHaveLength(3);

    const archivedInList = all.find(
      (t: { _id: string }) => t._id === archivedId,
    );
    expect(archivedInList).toBeDefined();
    expect(archivedInList!.archivedAt).toBeDefined();
  });

  test("returns templates with correct metadata fields", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Metadata Check",
      globalGuidance: "Some guidance.",
    });

    const all = await callHandler(listAllTemplates, ctx, {});
    expect(all).toHaveLength(1);

    const template = all[0];
    expect(template.category).toBe("workplace");
    expect(template.name).toBe("Metadata Check");
    expect(template.createdByUserId).toBe(ADMIN_USER._id);
    expect(typeof template.createdAt).toBe("number");
    expect(template.currentVersionId).toBeDefined();
  });

  test("returns empty array when no templates exist", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const all = await callHandler(listAllTemplates, ctx, {});
    expect(all).toHaveLength(0);
  });
});

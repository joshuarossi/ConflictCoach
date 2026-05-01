/**
 * WOR-59 AC2: admin/templates/create
 *
 * Creates a templates row + initial templateVersions row, returns templateId.
 */
import { describe, test, expect } from "vitest";
import {
  createMockContext,
  callHandler,
  ADMIN_USER,
  type MockTemplate,
  type MockTemplateVersion,
} from "./helpers";

// @ts-expect-error WOR-59 red-state import: implementation is created by task-implement.
import { createTemplate } from "../../convex/templates";

describe("AC2: admin/templates/create", () => {
  test("creates a templates row with correct fields", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Workplace Default",
      globalGuidance: "Be empathetic and neutral.",
    });

    const templates = getTable<MockTemplate>("templates");
    expect(templates).toHaveLength(1);
    expect(templates[0].category).toBe("workplace");
    expect(templates[0].name).toBe("Workplace Default");
    expect(templates[0].createdByUserId).toBe(ADMIN_USER._id);
    expect(typeof templates[0].createdAt).toBe("number");
  });

  test("creates an initial templateVersions row with version=1", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    await callHandler(createTemplate, ctx, {
      category: "family",
      name: "Family Template",
      globalGuidance: "Family guidance text.",
      coachInstructions: "Coach instructions here.",
      draftCoachInstructions: "Draft coach instructions.",
    });

    const versions = getTable<MockTemplateVersion>("templateVersions");
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
    expect(versions[0].globalGuidance).toBe("Family guidance text.");
    expect(versions[0].coachInstructions).toBe("Coach instructions here.");
    expect(versions[0].draftCoachInstructions).toBe(
      "Draft coach instructions.",
    );
    expect(versions[0].publishedByUserId).toBe(ADMIN_USER._id);
    expect(typeof versions[0].publishedAt).toBe("number");
  });

  test("sets templates.currentVersionId to the new version", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    await callHandler(createTemplate, ctx, {
      category: "personal",
      name: "Personal Template",
      globalGuidance: "Personal guidance.",
    });

    const templates = getTable<MockTemplate>("templates");
    const versions = getTable<MockTemplateVersion>("templateVersions");

    expect(templates[0].currentVersionId).toBe(versions[0]._id);
  });

  test("returns the templateId", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const result = await callHandler(createTemplate, ctx, {
      category: "contractual",
      name: "Contractual Template",
      globalGuidance: "Contractual guidance.",
    });

    const templates = getTable<MockTemplate>("templates");
    expect(result).toBe(templates[0]._id);
  });

  test("optional fields default to undefined when not provided", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    await callHandler(createTemplate, ctx, {
      category: "other",
      name: "Minimal Template",
      globalGuidance: "Minimal guidance.",
    });

    const versions = getTable<MockTemplateVersion>("templateVersions");
    expect(versions[0].coachInstructions).toBeUndefined();
    expect(versions[0].draftCoachInstructions).toBeUndefined();
  });
});

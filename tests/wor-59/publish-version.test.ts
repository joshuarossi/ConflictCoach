/**
 * WOR-59 AC3 & AC4: publishNewVersion + monotonic versions
 *
 * AC3: publishNewVersion creates a new immutable templateVersions row and
 *      updates templates.currentVersionId.
 * AC4: Version numbers are monotonically increasing within a template.
 */
import { describe, test, expect } from "vitest";
import {
  createMockContext,
  callHandler,
  ADMIN_USER,
  type MockTemplate,
  type MockTemplateVersion,
} from "./helpers";

import { createTemplate, publishNewVersion } from "../../convex/templates";

describe("AC3: admin/templates/publishNewVersion", () => {
  test("creates a new templateVersions row with version=2 after create", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Test Template",
      globalGuidance: "Initial guidance.",
    });

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "Updated guidance v2.",
      coachInstructions: "New coach instructions.",
    });

    const versions = getTable<MockTemplateVersion>("templateVersions");
    expect(versions).toHaveLength(2);

    const v2 = versions.find((v) => v.version === 2);
    expect(v2).toBeDefined();
    expect(v2!.globalGuidance).toBe("Updated guidance v2.");
    expect(v2!.coachInstructions).toBe("New coach instructions.");
    expect(v2!.publishedByUserId).toBe(ADMIN_USER._id);
  });

  test("updates templates.currentVersionId to the new version", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Version Update Test",
      globalGuidance: "v1 guidance.",
    });

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "v2 guidance.",
    });

    const templates = getTable<MockTemplate>("templates");
    const versions = getTable<MockTemplateVersion>("templateVersions");
    const v2 = versions.find((v) => v.version === 2);

    expect(templates[0].currentVersionId).toBe(v2!._id);
  });

  test("previous version rows are unchanged after publishing a new version (immutability)", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "family",
      name: "Immutability Test",
      globalGuidance: "Original v1.",
    });

    const versionsAfterCreate =
      getTable<MockTemplateVersion>("templateVersions");
    const v1Snapshot = { ...versionsAfterCreate[0] };

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "New v2.",
    });

    const versions = getTable<MockTemplateVersion>("templateVersions");
    const v1 = versions.find((v) => v.version === 1);

    expect(v1!.globalGuidance).toBe(v1Snapshot.globalGuidance);
    expect(v1!.publishedAt).toBe(v1Snapshot.publishedAt);
    expect(v1!.publishedByUserId).toBe(v1Snapshot.publishedByUserId);
  });

  test("publishing version 3 after version 2 works correctly", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "personal",
      name: "Multi-Version",
      globalGuidance: "v1.",
    });

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "v2.",
    });

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "v3.",
      notes: "Third version release notes.",
    });

    const versions = getTable<MockTemplateVersion>("templateVersions");
    expect(versions).toHaveLength(3);

    const v3 = versions.find((v) => v.version === 3);
    expect(v3).toBeDefined();
    expect(v3!.globalGuidance).toBe("v3.");
    expect(v3!.notes).toBe("Third version release notes.");

    const templates = getTable<MockTemplate>("templates");
    expect(templates[0].currentVersionId).toBe(v3!._id);
  });
});

describe("AC4: Monotonic version numbers", () => {
  test("version numbers are 1, 2, 3 in sequence", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Monotonic Test",
      globalGuidance: "v1.",
    });

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "v2.",
    });

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "v3.",
    });

    const versions = getTable<MockTemplateVersion>("templateVersions");
    const versionNumbers = versions.map((v) => v.version).sort((a, b) => a - b);

    expect(versionNumbers).toEqual([1, 2, 3]);
  });

  test("version numbers are strictly increasing (no gaps or duplicates)", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "family",
      name: "Strict Increase",
      globalGuidance: "v1.",
    });

    for (let i = 2; i <= 5; i++) {
      await callHandler(publishNewVersion, ctx, {
        templateId,
        globalGuidance: `v${i}.`,
      });
    }

    const versions = getTable<MockTemplateVersion>("templateVersions");
    const sorted = versions.map((v) => v.version).sort((a, b) => a - b);

    expect(sorted).toEqual([1, 2, 3, 4, 5]);

    // Verify each version is exactly 1 greater than the previous
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]).toBe(sorted[i - 1] + 1);
    }
  });
});

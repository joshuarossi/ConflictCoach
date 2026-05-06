/**
 * WOR-59 AC7: admin/templateVersions/list
 *
 * Returns all versions for a template, ordered by version descending.
 */
import { describe, test, expect } from "vitest";
import { createMockContext, callHandler, ADMIN_USER } from "./helpers";

import {
  createTemplate,
  publishNewVersion,
  listTemplateVersions,
} from "../../convex/templates";

describe("AC7: admin/templateVersions/list", () => {
  test("returns all 3 versions for a template", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "workplace",
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
    });

    const versions = await callHandler(listTemplateVersions, ctx, {
      templateId,
    });
    expect(versions).toHaveLength(3);
  });

  test("versions are ordered by version number descending", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "family",
      name: "Order Test",
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

    const versions = await callHandler(listTemplateVersions, ctx, {
      templateId,
    });
    const versionNumbers = versions.map((v: { version: number }) => v.version);

    expect(versionNumbers).toEqual([3, 2, 1]);
  });

  test("each version has correct content", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "personal",
      name: "Content Check",
      globalGuidance: "First version guidance.",
    });

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "Second version guidance.",
      notes: "Updated for clarity.",
    });

    const versions = await callHandler(listTemplateVersions, ctx, {
      templateId,
    });

    // Descending order: v2 first, v1 second
    expect(versions[0].version).toBe(2);
    expect(versions[0].globalGuidance).toBe("Second version guidance.");
    expect(versions[0].notes).toBe("Updated for clarity.");

    expect(versions[1].version).toBe(1);
    expect(versions[1].globalGuidance).toBe("First version guidance.");
  });

  test("returns single version for a newly created template", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "other",
      name: "Single Version",
      globalGuidance: "Only version.",
    });

    const versions = await callHandler(listTemplateVersions, ctx, {
      templateId,
    });
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
  });
});

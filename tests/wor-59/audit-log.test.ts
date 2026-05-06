/**
 * WOR-59 AC8: Audit log entries
 *
 * An audit log entry is written for each create/publish/archive action.
 */
import { describe, test, expect } from "vitest";
import {
  createMockContext,
  callHandler,
  ADMIN_USER,
  type MockAuditLogEntry,
} from "./helpers";

import {
  createTemplate,
  publishNewVersion,
  archiveTemplate,
} from "../../convex/templates";

describe("AC8: Audit log entries", () => {
  test("create action writes TEMPLATE_CREATED audit log entry", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Audited Template",
      globalGuidance: "Guidance.",
    });

    const auditEntries = getTable<MockAuditLogEntry>("auditLog");
    const createEntry = auditEntries.find(
      (e) => e.action === "TEMPLATE_CREATED",
    );

    expect(createEntry).toBeDefined();
    expect(createEntry!.actorUserId).toBe(ADMIN_USER._id);
    expect(createEntry!.targetId).toBe(templateId);
    expect(typeof createEntry!.createdAt).toBe("number");
  });

  test("publish action writes TEMPLATE_PUBLISHED audit log entry", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "family",
      name: "Publish Audit",
      globalGuidance: "v1.",
    });

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "v2.",
    });

    const auditEntries = getTable<MockAuditLogEntry>("auditLog");
    const publishEntry = auditEntries.find(
      (e) => e.action === "TEMPLATE_PUBLISHED",
    );

    expect(publishEntry).toBeDefined();
    expect(publishEntry!.actorUserId).toBe(ADMIN_USER._id);
    expect(typeof publishEntry!.createdAt).toBe("number");
  });

  test("archive action writes TEMPLATE_ARCHIVED audit log entry", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "personal",
      name: "Archive Audit",
      globalGuidance: "Guidance.",
    });

    await callHandler(archiveTemplate, ctx, { templateId });

    const auditEntries = getTable<MockAuditLogEntry>("auditLog");
    const archiveEntry = auditEntries.find(
      (e) => e.action === "TEMPLATE_ARCHIVED",
    );

    expect(archiveEntry).toBeDefined();
    expect(archiveEntry!.actorUserId).toBe(ADMIN_USER._id);
    expect(archiveEntry!.targetId).toBe(templateId);
    expect(typeof archiveEntry!.createdAt).toBe("number");
  });

  test("create + publish + archive produces 3 audit log entries", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "contractual",
      name: "Full Lifecycle Audit",
      globalGuidance: "v1.",
    });

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "v2.",
    });

    await callHandler(archiveTemplate, ctx, { templateId });

    const auditEntries = getTable<MockAuditLogEntry>("auditLog");

    // Should have at least 3 entries for the 3 actions
    expect(auditEntries.length).toBeGreaterThanOrEqual(3);

    const actions = auditEntries.map((e) => e.action);
    expect(actions).toContain("TEMPLATE_CREATED");
    expect(actions).toContain("TEMPLATE_PUBLISHED");
    expect(actions).toContain("TEMPLATE_ARCHIVED");

    // All entries should reference the admin user
    for (const entry of auditEntries) {
      expect(entry.actorUserId).toBe(ADMIN_USER._id);
    }
  });

  test("audit log entries have correct targetType", async () => {
    const { ctx, getTable } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const templateId = await callHandler(createTemplate, ctx, {
      category: "other",
      name: "Target Type Check",
      globalGuidance: "Guidance.",
    });

    await callHandler(publishNewVersion, ctx, {
      templateId,
      globalGuidance: "v2.",
    });

    await callHandler(archiveTemplate, ctx, { templateId });

    const auditEntries = getTable<MockAuditLogEntry>("auditLog");

    const createEntry = auditEntries.find(
      (e) => e.action === "TEMPLATE_CREATED",
    );
    const publishEntry = auditEntries.find(
      (e) => e.action === "TEMPLATE_PUBLISHED",
    );
    const archiveEntry = auditEntries.find(
      (e) => e.action === "TEMPLATE_ARCHIVED",
    );

    // Create and archive target the template
    expect(createEntry!.targetType).toBe("template");
    expect(archiveEntry!.targetType).toBe("template");

    // Publish targets the templateVersion
    expect(publishEntry!.targetType).toBe("templateVersion");
  });
});

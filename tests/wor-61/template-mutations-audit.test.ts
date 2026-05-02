/**
 * Integration tests for admin template mutations calling writeAuditLog (WOR-61, AC2)
 *
 * AC2: All admin template mutations call writeAuditLog with appropriate action
 *      strings (TEMPLATE_CREATED, TEMPLATE_PUBLISHED, TEMPLATE_ARCHIVED).
 *
 * These tests verify that template create, publish, and archive mutations
 * each write an audit log entry with the correct action string.
 *
 * These tests will FAIL until the admin template mutations are implemented.
 * Once implemented, update the import path from ./__stubs__/admin-templates to
 * ../../convex/admin/templates.
 */
import { describe, test, expect, vi } from "vitest";
import { createTemplate, publishVersion, archiveTemplate } from "./__stubs__/admin-templates";

// ---------------------------------------------------------------------------
// Mock context with audit log tracking
// ---------------------------------------------------------------------------

function createAdminMutationContext() {
  const auditLogEntries: Array<Record<string, unknown>> = [];
  const templates: Array<Record<string, unknown>> = [];
  const templateVersions: Array<Record<string, unknown>> = [];
  let idCounter = 0;

  const adminUser = {
    _id: "users_admin",
    email: "admin@example.com",
    role: "ADMIN" as const,
    createdAt: 1000,
  };

  return {
    auth: {
      getUserIdentity: vi.fn(async () => ({
        email: adminUser.email,
        subject: adminUser._id,
        tokenIdentifier: `token_${adminUser._id}`,
      })),
    },
    db: {
      get: vi.fn(async (id: string) => {
        const template = templates.find((t) => t._id === id);
        if (template) return template;
        const version = templateVersions.find((v) => v._id === id);
        if (version) return version;
        if (id === adminUser._id) return adminUser;
        return null;
      }),
      query: vi.fn((table: string) => {
        if (table === "users") {
          return {
            withIndex: (_name: string, _predicate: unknown) => ({
              first: vi.fn(async () => adminUser),
            }),
          };
        }
        return {
          withIndex: (_name: string, _predicate: unknown) => ({
            first: vi.fn(async () => null),
            collect: vi.fn(async () => []),
          }),
          collect: vi.fn(async () => []),
        };
      }),
      insert: vi.fn(async (table: string, doc: Record<string, unknown>) => {
        const id = `${table}_${++idCounter}`;
        const record = { _id: id, ...doc };
        if (table === "auditLog") auditLogEntries.push(record);
        if (table === "templates") templates.push(record);
        if (table === "templateVersions") templateVersions.push(record);
        return id;
      }),
      patch: vi.fn(async (id: string, fields: Record<string, unknown>) => {
        const template = templates.find((t) => t._id === id);
        if (template) Object.assign(template, fields);
      }),
    },
    _auditLogEntries: auditLogEntries,
    _templates: templates,
    _templateVersions: templateVersions,
  };
}

// ---------------------------------------------------------------------------
// AC2: Template mutations write audit log entries
// ---------------------------------------------------------------------------
describe("AC2: Admin template mutations call writeAuditLog", () => {
  test("createTemplate writes an audit entry with action TEMPLATE_CREATED", async () => {
    const ctx = createAdminMutationContext();

    await createTemplate(ctx, {
      category: "workplace",
      name: "Workplace Default",
      globalGuidance: "Be empathetic",
      coachInstructions: "Guide the conversation",
      draftCoachInstructions: "Help draft messages",
    });

    const auditEntry = ctx._auditLogEntries.find(
      (e) => e.action === "TEMPLATE_CREATED",
    );
    expect(auditEntry).toBeDefined();
    expect(auditEntry!.actorUserId).toBe("users_admin");
    expect(auditEntry!.targetType).toBe("template");
  });

  test("publishVersion writes an audit entry with action TEMPLATE_PUBLISHED", async () => {
    const ctx = createAdminMutationContext();
    // Pre-populate a template to publish
    ctx._templates.push({
      _id: "templates_existing",
      name: "Test Template",
      category: "family",
      createdByUserId: "users_admin",
      createdAt: 1000,
    });

    await publishVersion(ctx, {
      templateId: "templates_existing",
      globalGuidance: "Updated guidance",
      coachInstructions: "Updated coach instructions",
      draftCoachInstructions: "Updated draft coach instructions",
      notes: "Version 2 update",
    });

    const auditEntry = ctx._auditLogEntries.find(
      (e) => e.action === "TEMPLATE_PUBLISHED",
    );
    expect(auditEntry).toBeDefined();
    expect(auditEntry!.actorUserId).toBe("users_admin");
    expect(auditEntry!.targetType).toBe("templateVersion");
  });

  test("archiveTemplate writes an audit entry with action TEMPLATE_ARCHIVED", async () => {
    const ctx = createAdminMutationContext();
    // Pre-populate a template to archive
    ctx._templates.push({
      _id: "templates_toarchive",
      name: "Old Template",
      category: "personal",
      createdByUserId: "users_admin",
      createdAt: 1000,
      archivedAt: undefined,
    });

    await archiveTemplate(ctx, {
      templateId: "templates_toarchive",
    });

    const auditEntry = ctx._auditLogEntries.find(
      (e) => e.action === "TEMPLATE_ARCHIVED",
    );
    expect(auditEntry).toBeDefined();
    expect(auditEntry!.actorUserId).toBe("users_admin");
    expect(auditEntry!.targetType).toBe("template");
    expect(auditEntry!.targetId).toBe("templates_toarchive");
  });
});

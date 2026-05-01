/**
 * Unit tests for admin/audit/list query (WOR-61, AC3 & AC4)
 *
 * AC3: admin/audit/list query returns audit log entries, filterable by actor
 *      and action type, ordered by createdAt descending.
 * AC4: Query is admin-gated; throws FORBIDDEN for non-admins.
 *
 * These tests will FAIL until the admin/audit/list implementation exists.
 * Once implemented, update the import path from ./__stubs__/admin-audit to
 * ../../convex/admin/audit.
 */
import { describe, test, expect, vi } from "vitest";
import { listAuditLogs, type AuditLogEntry } from "./__stubs__/admin-audit";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const AUDIT_ENTRIES = [
  {
    _id: "auditLog_1",
    actorUserId: "users_admin1",
    action: "TEMPLATE_CREATED",
    targetType: "template",
    targetId: "templates_1",
    metadata: { category: "workplace" },
    createdAt: 1000,
  },
  {
    _id: "auditLog_2",
    actorUserId: "users_admin2",
    action: "TEMPLATE_PUBLISHED",
    targetType: "templateVersion",
    targetId: "templateVersions_1",
    metadata: { version: 1 },
    createdAt: 2000,
  },
  {
    _id: "auditLog_3",
    actorUserId: "users_admin1",
    action: "TEMPLATE_ARCHIVED",
    targetType: "template",
    targetId: "templates_2",
    createdAt: 3000,
  },
  {
    _id: "auditLog_4",
    actorUserId: "users_admin2",
    action: "TEMPLATE_CREATED",
    targetType: "template",
    targetId: "templates_3",
    metadata: { category: "family" },
    createdAt: 4000,
  },
];

// ---------------------------------------------------------------------------
// Mock Convex query context
// ---------------------------------------------------------------------------

function createMockQueryContext(options: {
  userRole: "USER" | "ADMIN";
  userEmail: string;
  userId: string;
}) {
  const userRecord = {
    _id: options.userId,
    email: options.userEmail,
    role: options.userRole,
    createdAt: 500,
  };

  return {
    auth: {
      getUserIdentity: vi.fn(async () => ({
        email: options.userEmail,
        subject: options.userId,
        tokenIdentifier: `token_${options.userId}`,
      })),
    },
    db: {
      get: vi.fn(async (id: string) => {
        if (id === options.userId) return userRecord;
        return AUDIT_ENTRIES.find((e) => e._id === id) ?? null;
      }),
      query: vi.fn((table: string) => {
        if (table === "users") {
          return {
            withIndex: (_name: string, _predicate: unknown) => ({
              first: vi.fn(async () => userRecord),
            }),
          };
        }
        if (table === "auditLog") {
          return {
            withIndex: (_name: string, _predicate: unknown) => ({
              order: (dir: string) => ({
                collect: vi.fn(async () => {
                  const sorted = [...AUDIT_ENTRIES].sort((a, b) =>
                    dir === "desc"
                      ? b.createdAt - a.createdAt
                      : a.createdAt - b.createdAt,
                  );
                  return sorted;
                }),
              }),
              collect: vi.fn(async () => [...AUDIT_ENTRIES]),
            }),
            order: (dir: string) => ({
              collect: vi.fn(async () => {
                const sorted = [...AUDIT_ENTRIES].sort((a, b) =>
                  dir === "desc"
                    ? b.createdAt - a.createdAt
                    : a.createdAt - b.createdAt,
                );
                return sorted;
              }),
              filter: (predicate: (doc: unknown) => boolean) => ({
                collect: vi.fn(async () => {
                  const sorted = [...AUDIT_ENTRIES].sort((a, b) =>
                    dir === "desc"
                      ? b.createdAt - a.createdAt
                      : a.createdAt - b.createdAt,
                  );
                  return sorted.filter(predicate);
                }),
              }),
            }),
            collect: vi.fn(async () => [...AUDIT_ENTRIES]),
          };
        }
        return {
          withIndex: () => ({ first: vi.fn(async () => null) }),
          collect: vi.fn(async () => []),
        };
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// AC4: Admin gate — throws FORBIDDEN for non-admins
// ---------------------------------------------------------------------------
describe("AC4: admin/audit/list is admin-gated", () => {
  test("throws FORBIDDEN when called by a non-admin user", async () => {
    const ctx = createMockQueryContext({
      userRole: "USER",
      userEmail: "regular@example.com",
      userId: "users_regular",
    });

    await expect(listAuditLogs(ctx, {})).rejects.toThrow();
    try {
      await listAuditLogs(ctx, {});
    } catch (error: unknown) {
      const err = error as { data?: { code?: string } };
      expect(err.data?.code).toBe("FORBIDDEN");
    }
  });

  test("does not throw when called by an admin user", async () => {
    const ctx = createMockQueryContext({
      userRole: "ADMIN",
      userEmail: "admin@example.com",
      userId: "users_admin1",
    });

    await expect(listAuditLogs(ctx, {})).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC3: Filterable audit log entries, ordered by createdAt descending
// ---------------------------------------------------------------------------
describe("AC3: admin/audit/list returns filterable, ordered entries", () => {
  test("returns all entries when no filters are provided", async () => {
    const ctx = createMockQueryContext({
      userRole: "ADMIN",
      userEmail: "admin@example.com",
      userId: "users_admin1",
    });

    const results = await listAuditLogs(ctx, {});

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(AUDIT_ENTRIES.length);
  });

  test("results are ordered by createdAt descending (newest first)", async () => {
    const ctx = createMockQueryContext({
      userRole: "ADMIN",
      userEmail: "admin@example.com",
      userId: "users_admin1",
    });

    const results = await listAuditLogs(ctx, {});

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].createdAt).toBeGreaterThanOrEqual(
        results[i].createdAt,
      );
    }
  });

  test("filters by actorUserId when provided", async () => {
    const ctx = createMockQueryContext({
      userRole: "ADMIN",
      userEmail: "admin@example.com",
      userId: "users_admin1",
    });

    const results = await listAuditLogs(ctx, {
      actorUserId: "users_admin1",
    });

    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) {
      expect(entry.actorUserId).toBe("users_admin1");
    }
  });

  test("filters by action type when provided", async () => {
    const ctx = createMockQueryContext({
      userRole: "ADMIN",
      userEmail: "admin@example.com",
      userId: "users_admin1",
    });

    const results = await listAuditLogs(ctx, {
      action: "TEMPLATE_CREATED",
    });

    expect(results.length).toBeGreaterThan(0);
    for (const entry of results) {
      expect(entry.action).toBe("TEMPLATE_CREATED");
    }
  });

  test("filters by both actorUserId and action simultaneously", async () => {
    const ctx = createMockQueryContext({
      userRole: "ADMIN",
      userEmail: "admin@example.com",
      userId: "users_admin1",
    });

    const results = await listAuditLogs(ctx, {
      actorUserId: "users_admin2",
      action: "TEMPLATE_CREATED",
    });

    expect(results.length).toBe(1);
    expect(results[0].actorUserId).toBe("users_admin2");
    expect(results[0].action).toBe("TEMPLATE_CREATED");
  });

  test("returns empty array when filters match no entries", async () => {
    const ctx = createMockQueryContext({
      userRole: "ADMIN",
      userEmail: "admin@example.com",
      userId: "users_admin1",
    });

    const results = await listAuditLogs(ctx, {
      actorUserId: "users_nonexistent",
    });

    expect(results).toEqual([]);
  });
});

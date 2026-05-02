/**
 * Unit tests for writeAuditLog utility (WOR-61, AC1 & AC5)
 *
 * AC1: writeAuditLog(ctx, { action, targetType, targetId, metadata }) utility
 *      is exported from convex/lib/audit.ts (or convex/lib/errors.ts)
 * AC5: Each audit entry includes actorUserId, action, targetType, targetId,
 *      metadata (JSON), createdAt — and createdAt is a valid timestamp.
 *
 * These tests will FAIL until the writeAuditLog implementation exists.
 * Once implemented, update the import path from ./__stubs__/audit to
 * ../../convex/lib/audit.
 */
import { describe, test, expect, vi } from "vitest";
import { writeAuditLog } from "./__stubs__/audit";

// ---------------------------------------------------------------------------
// Mock Convex mutation context
// ---------------------------------------------------------------------------

interface AuditLogRow {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
  createdAt: number;
}

function createMockMutationContext(options: { actorUserId: string }) {
  const auditLogTable: AuditLogRow[] = [];
  let idCounter = 0;

  return {
    auth: {
      getUserIdentity: vi.fn(async () => ({
        email: "admin@example.com",
        subject: options.actorUserId,
        tokenIdentifier: `token_${options.actorUserId}`,
      })),
    },
    db: {
      insert: vi.fn(async (table: string, doc: Record<string, unknown>) => {
        if (table === "auditLog") {
          auditLogTable.push(doc as unknown as AuditLogRow);
          return `auditLog_${++idCounter}`;
        }
        return `${table}_${++idCounter}`;
      }),
      query: vi.fn(),
      get: vi.fn(),
    },
    _auditLogTable: auditLogTable,
    _actorUserId: options.actorUserId,
  };
}

// ---------------------------------------------------------------------------
// AC1: writeAuditLog utility exists and is callable
// ---------------------------------------------------------------------------
describe("AC1: writeAuditLog utility is exported and callable", () => {
  test("writeAuditLog is a function", () => {
    expect(typeof writeAuditLog).toBe("function");
  });

  test("writeAuditLog inserts a row into the auditLog table", async () => {
    const ctx = createMockMutationContext({ actorUserId: "users_1" });

    await writeAuditLog(ctx, {
      actorUserId: "users_1",
      action: "TEMPLATE_CREATED",
      targetType: "template",
      targetId: "templates_1",
      metadata: { category: "workplace" },
    });

    expect(ctx.db.insert).toHaveBeenCalledTimes(1);
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "auditLog",
      expect.objectContaining({
        actorUserId: "users_1",
        action: "TEMPLATE_CREATED",
        targetType: "template",
        targetId: "templates_1",
      }),
    );
  });

  test("writeAuditLog works without optional metadata", async () => {
    const ctx = createMockMutationContext({ actorUserId: "users_2" });

    await writeAuditLog(ctx, {
      actorUserId: "users_2",
      action: "TEMPLATE_ARCHIVED",
      targetType: "template",
      targetId: "templates_5",
    });

    expect(ctx.db.insert).toHaveBeenCalledTimes(1);
    expect(ctx.db.insert).toHaveBeenCalledWith(
      "auditLog",
      expect.objectContaining({
        actorUserId: "users_2",
        action: "TEMPLATE_ARCHIVED",
        targetType: "template",
        targetId: "templates_5",
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// AC5: Entry shape — all required fields present and createdAt is valid
// ---------------------------------------------------------------------------
describe("AC5: Audit entry includes all required fields", () => {
  test("inserted row contains actorUserId, action, targetType, targetId, metadata, createdAt", async () => {
    const ctx = createMockMutationContext({ actorUserId: "users_3" });
    const metadata = { templateId: "templates_10", versionNumber: 2 };

    await writeAuditLog(ctx, {
      actorUserId: "users_3",
      action: "TEMPLATE_PUBLISHED",
      targetType: "templateVersion",
      targetId: "templateVersions_7",
      metadata,
    });

    expect(ctx._auditLogTable).toHaveLength(1);
    const entry = ctx._auditLogTable[0];

    expect(entry.actorUserId).toBe("users_3");
    expect(entry.action).toBe("TEMPLATE_PUBLISHED");
    expect(entry.targetType).toBe("templateVersion");
    expect(entry.targetId).toBe("templateVersions_7");
    expect(entry.metadata).toEqual(metadata);
    expect(entry.createdAt).toBeDefined();
  });

  test("createdAt is a valid timestamp (positive number, reasonable epoch ms)", async () => {
    const before = Date.now();
    const ctx = createMockMutationContext({ actorUserId: "users_4" });

    await writeAuditLog(ctx, {
      actorUserId: "users_4",
      action: "TEMPLATE_CREATED",
      targetType: "template",
      targetId: "templates_99",
    });

    const after = Date.now();
    const entry = ctx._auditLogTable[0];

    expect(typeof entry.createdAt).toBe("number");
    expect(entry.createdAt).toBeGreaterThanOrEqual(before);
    expect(entry.createdAt).toBeLessThanOrEqual(after);
  });
});

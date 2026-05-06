/**
 * Tests for WOR-55 AC1: "New Solo Case" option creates a case with isSolo=true
 * via the cases/create mutation.
 *
 * The cases/create mutation already exists and handles isSolo=true. These tests
 * verify the solo-mode behavior: both party states created, status set to
 * BOTH_PRIVATE_COACHING, no invite token generated.
 */
import { describe, test, expect, vi } from "vitest";

import { create } from "../../convex/cases/create";

// ---------------------------------------------------------------------------
// Convex handler resolution utility
// ---------------------------------------------------------------------------

/**
 * Convex mutation()/query() wrappers expose the handler via different
 * properties depending on version. Resolve to a callable.
 */
function asCallable(fn: unknown): { handler: (ctx: any, args: any) => Promise<any> } {
  const anyFn = fn as any;
  if (typeof anyFn === "function") {
    return { handler: anyFn };
  }
  if (typeof anyFn?.handler === "function") {
    return { handler: anyFn.handler };
  }
  if (typeof anyFn?._handler === "function") {
    return { handler: anyFn._handler };
  }
  throw new Error(
    "Could not resolve Convex function to a callable handler: " +
      JSON.stringify(Object.keys((fn as object) ?? {})),
  );
}

const createFn = asCallable(create);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = "users:test_solo_user" as any;

function createMockMutationCtx(options: {
  authenticatedUserId?: string | null;
  dbData?: Record<string, any[]>;
}) {
  const { authenticatedUserId = null, dbData = {} } = options;

  const email = authenticatedUserId ? `${authenticatedUserId}@test.local` : null;
  const seededUsers = [...(dbData.users ?? [])];
  if (authenticatedUserId && !seededUsers.some((u) => u._id === authenticatedUserId)) {
    seededUsers.push({
      _id: authenticatedUserId,
      email,
      role: "USER" as const,
      createdAt: 0,
    });
  }
  const effectiveDb: Record<string, any[]> = { ...dbData, users: seededUsers };

  function buildIndexedQuery(rows: any[]) {
    return (_indexName: string, predicate?: (q: any) => unknown) => {
      const filters: Array<{ field: string; value: any }> = [];
      if (typeof predicate === "function") {
        const eqFn = (field: string, value: any) => {
          filters.push({ field, value });
          return { eq: eqFn };
        };
        try {
          predicate({ eq: eqFn });
        } catch {
          /* ignore */
        }
      }
      const matched = filters.length
        ? rows.filter((r) => filters.every((f) => r[f.field] === f.value))
        : rows;
      return {
        collect: vi.fn(async () => matched),
        first: vi.fn(async () => matched[0] ?? null),
        filter: vi.fn(() => ({
          collect: vi.fn(async () => matched),
        })),
      };
    };
  }

  const insertedRows: Array<{ table: string; doc: any }> = [];

  return {
    auth: {
      getUserIdentity: vi.fn(async () =>
        authenticatedUserId
          ? {
              subject: authenticatedUserId,
              email,
              tokenIdentifier: `token:${authenticatedUserId}`,
            }
          : null,
      ),
    },
    db: {
      query: vi.fn((table: string) => {
        const rows = effectiveDb[table] ?? [];
        return {
          withIndex: vi.fn(buildIndexedQuery(rows)),
          collect: vi.fn(async () => rows),
          filter: vi.fn(() => ({
            collect: vi.fn(async () => rows),
          })),
        };
      }),
      get: vi.fn(async (id: string) => {
        for (const rows of Object.values(effectiveDb)) {
          const found = (rows as any[]).find((r: any) => r._id === id);
          if (found) return found;
        }
        return null;
      }),
      insert: vi.fn(async (table: string, doc: any) => {
        const id = `${table}:auto_${insertedRows.length}`;
        insertedRows.push({ table, doc });
        return id;
      }),
      patch: vi.fn(async () => {}),
    },
    insertedRows,
  };
}

// Active template fixture required by create mutation
const activeTemplate = {
  _id: "templates:tpl_001" as any,
  category: "workplace",
  currentVersionId: "templateVersions:tv_001" as any,
  archivedAt: undefined,
};

// ---------------------------------------------------------------------------
// AC 1: Solo case creation
// ---------------------------------------------------------------------------
describe("AC 1: 'New Solo Case' creates a case with isSolo=true", () => {
  test("create with isSolo=true returns a caseId and no inviteUrl", async () => {
    const ctx = createMockMutationCtx({
      authenticatedUserId: USER_ID,
      dbData: { templates: [activeTemplate] },
    });

    const handler = createFn.handler;
    const result = await handler(ctx, {
      category: "workplace",
      mainTopic: "Test solo case",
      isSolo: true,
    });

    expect(result).toBeDefined();
    expect(result.caseId).toBeDefined();
    // Solo cases should NOT generate an invite URL
    expect(result.inviteUrl).toBeUndefined();
  });

  test("create with isSolo=true inserts case row with isSolo=true and status BOTH_PRIVATE_COACHING", async () => {
    const ctx = createMockMutationCtx({
      authenticatedUserId: USER_ID,
      dbData: { templates: [activeTemplate] },
    });

    const handler = createFn.handler;
    await handler(ctx, {
      category: "workplace",
      mainTopic: "Test solo case",
      isSolo: true,
    });

    const caseRow = ctx.insertedRows.find((r) => r.table === "cases");
    expect(caseRow).toBeDefined();
    expect(caseRow!.doc.isSolo).toBe(true);
    expect(caseRow!.doc.status).toBe("BOTH_PRIVATE_COACHING");
  });

  test("create with isSolo=true sets both initiatorUserId and inviteeUserId to the same user", async () => {
    const ctx = createMockMutationCtx({
      authenticatedUserId: USER_ID,
      dbData: { templates: [activeTemplate] },
    });

    const handler = createFn.handler;
    await handler(ctx, {
      category: "workplace",
      mainTopic: "Test solo case",
      isSolo: true,
    });

    const caseRow = ctx.insertedRows.find((r) => r.table === "cases");
    expect(caseRow!.doc.initiatorUserId).toBe(USER_ID);
    expect(caseRow!.doc.inviteeUserId).toBe(USER_ID);
  });

  test("create with isSolo=true creates both INITIATOR and INVITEE partyStates", async () => {
    const ctx = createMockMutationCtx({
      authenticatedUserId: USER_ID,
      dbData: { templates: [activeTemplate] },
    });

    const handler = createFn.handler;
    await handler(ctx, {
      category: "workplace",
      mainTopic: "Test solo case",
      isSolo: true,
    });

    const partyStates = ctx.insertedRows.filter((r) => r.table === "partyStates");
    expect(partyStates).toHaveLength(2);

    const roles = partyStates.map((ps) => ps.doc.role).sort();
    expect(roles).toEqual(["INITIATOR", "INVITEE"]);

    // Both partyStates reference the same user
    for (const ps of partyStates) {
      expect(ps.doc.userId).toBe(USER_ID);
    }
  });

  test("create with isSolo=true does NOT insert an inviteToken", async () => {
    const ctx = createMockMutationCtx({
      authenticatedUserId: USER_ID,
      dbData: { templates: [activeTemplate] },
    });

    const handler = createFn.handler;
    await handler(ctx, {
      category: "workplace",
      mainTopic: "Test solo case",
      isSolo: true,
    });

    const inviteTokens = ctx.insertedRows.filter((r) => r.table === "inviteTokens");
    expect(inviteTokens).toHaveLength(0);
  });
});

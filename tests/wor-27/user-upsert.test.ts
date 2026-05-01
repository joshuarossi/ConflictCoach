/**
 * Unit tests for user upsert on login (WOR-27, AC1 & AC2)
 *
 * AC1: On first login, a users row is created with email, role=USER, and createdAt
 * AC2: On subsequent logins, the existing user record is returned without duplication
 *
 * These tests will FAIL until the upsert implementation exists.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";

// @ts-expect-error WOR-27 red-state import: upsertUser is created by task-implement.
import { upsertUser } from "../../convex/lib/auth";

// ---------------------------------------------------------------------------
// Mock Convex context
// ---------------------------------------------------------------------------

/** Simulates a minimal Convex mutation context with in-memory users table. */
function createMockContext(options: {
  identity: { email: string; subject?: string } | null;
}) {
  const usersTable: Array<{
    _id: string;
    email: string;
    role: "USER" | "ADMIN";
    createdAt: number;
    displayName?: string;
  }> = [];

  let idCounter = 0;

  return {
    auth: {
      getUserIdentity: vi.fn(async () =>
        options.identity
          ? {
              email: options.identity.email,
              subject: options.identity.subject ?? `subject_${options.identity.email}`,
              tokenIdentifier: `token_${options.identity.email}`,
            }
          : null,
      ),
    },
    db: {
      get: vi.fn(async (id: string) =>
        usersTable.find((u) => u._id === id) ?? null,
      ),
      query: vi.fn((table: string) => ({
        withIndex: (_name: string, predicate: (q: any) => unknown) => {
          // Simulate the by_email index lookup
          const q = {
            eq: (_field: string, value: string) => value,
          };
          const emailValue = predicate(q) as string;
          return {
            first: vi.fn(async () => {
              if (table === "users") {
                return usersTable.find((u) => u.email === emailValue) ?? null;
              }
              return null;
            }),
          };
        },
      })),
      insert: vi.fn(async (table: string, doc: any) => {
        if (table === "users") {
          const id = `users_${++idCounter}`;
          usersTable.push({ _id: id, ...doc });
          return id;
        }
        return `${table}_${++idCounter}`;
      }),
    },
    /** Expose for test assertions */
    _usersTable: usersTable,
  };
}

// ---------------------------------------------------------------------------
// AC 1: On first login, a users row is created with email, role=USER, and createdAt
// ---------------------------------------------------------------------------
describe("AC1: First login creates a user record", () => {
  test("upsertUser creates a new user with email, role=USER, and createdAt", async () => {
    const ctx = createMockContext({
      identity: { email: "alex@example.com" },
    });

    const user = await upsertUser(ctx);

    expect(user).toBeDefined();
    expect(user.email).toBe("alex@example.com");
    expect(user.role).toBe("USER");
    expect(typeof user.createdAt).toBe("number");
    expect(user.createdAt).toBeGreaterThan(0);
  });

  test("upsertUser inserts exactly one row in the users table on first call", async () => {
    const ctx = createMockContext({
      identity: { email: "jordan@example.com" },
    });

    await upsertUser(ctx);

    expect(ctx._usersTable).toHaveLength(1);
    expect(ctx._usersTable[0].email).toBe("jordan@example.com");
    expect(ctx._usersTable[0].role).toBe("USER");
  });

  test("upsertUser returns an _id for the created user", async () => {
    const ctx = createMockContext({
      identity: { email: "new@example.com" },
    });

    const user = await upsertUser(ctx);

    expect(user._id).toBeDefined();
    expect(typeof user._id).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// AC 2: On subsequent logins, the existing user record is returned without duplication
// ---------------------------------------------------------------------------
describe("AC2: Subsequent login returns existing user without duplication", () => {
  test("calling upsertUser twice with the same email does not create a duplicate", async () => {
    const ctx = createMockContext({
      identity: { email: "repeat@example.com" },
    });

    const first = await upsertUser(ctx);
    const second = await upsertUser(ctx);

    // Only one row should exist
    expect(ctx._usersTable).toHaveLength(1);
    // Both calls should return the same user
    expect(first._id).toBe(second._id);
    expect(first.email).toBe(second.email);
  });

  test("the returned record on subsequent login matches the original", async () => {
    const ctx = createMockContext({
      identity: { email: "stable@example.com" },
    });

    const first = await upsertUser(ctx);
    const second = await upsertUser(ctx);

    expect(second.email).toBe(first.email);
    expect(second.role).toBe(first.role);
    expect(second.createdAt).toBe(first.createdAt);
  });

  test("upsertUser does not overwrite existing user fields", async () => {
    const ctx = createMockContext({
      identity: { email: "preserve@example.com" },
    });

    const original = await upsertUser(ctx);
    const originalCreatedAt = original.createdAt;

    // Second call should not change createdAt
    const returned = await upsertUser(ctx);
    expect(returned.createdAt).toBe(originalCreatedAt);
  });
});

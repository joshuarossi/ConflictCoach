import { describe, test, expect, vi, beforeEach } from "vitest";

/**
 * WOR-27: User upsert on login and role management
 *
 * These tests target the upsertUser mutation (convex/users.ts) and auth
 * helpers (convex/lib/auth.ts) that do not exist yet. Imports will fail
 * at test time, which is the correct "red" state.
 */

// --- Imports that will fail until implementation lands ---
// AC 1 & 2: upsertUser mutation handler
import { upsertUser } from "../../convex/users";
// AC 3: getUserByEmail helper
import { getUserByEmail } from "../../convex/lib/auth";
// AC 5: isAdmin helper
import { isAdmin } from "../../convex/lib/auth";

// ---------------------------------------------------------------------------
// Mock helpers — simulate Convex ctx with an in-memory users table
// ---------------------------------------------------------------------------

type UserRow = {
  _id: string;
  email: string;
  displayName?: string;
  role: "USER" | "ADMIN";
  createdAt: number;
};

function createMockDb() {
  const rows: Map<string, UserRow> = new Map();
  let idCounter = 0;

  return {
    _rows: rows,

    insert: vi.fn(async (_table: string, doc: Omit<UserRow, "_id">) => {
      const id = `users:${++idCounter}`;
      const row = { ...doc, _id: id } as UserRow;
      rows.set(id, row);
      return id;
    }),

    get: vi.fn(async (id: string) => rows.get(id) ?? null),

    query: vi.fn((table: string) => ({
      withIndex: (_name: string, predicate: (q: any) => unknown) => {
        // Capture the email from the predicate call
        let matchEmail: string | undefined;
        const q = {
          eq: (_field: string, value: string) => {
            matchEmail = value;
            return true;
          },
        };
        predicate(q);

        return {
          first: vi.fn(async () => {
            if (!matchEmail) return null;
            for (const row of rows.values()) {
              if (row.email === matchEmail) return row;
            }
            return null;
          }),
        };
      },
    })),

    patch: vi.fn(async (id: string, updates: Partial<UserRow>) => {
      const existing = rows.get(id);
      if (existing) {
        rows.set(id, { ...existing, ...updates });
      }
    }),
  };
}

function createMockCtx(identity: { subject?: string; email?: string } | null) {
  const db = createMockDb();
  return {
    db,
    auth: {
      getUserIdentity: vi.fn(async () => identity),
    },
  };
}

// ---------------------------------------------------------------------------
// AC 1: On first login, a users row is created with email, role=USER,
//        and createdAt
// ---------------------------------------------------------------------------
describe("AC 1: On first login, a users row is created with email, role=USER, and createdAt", () => {
  test("On first login, a users row is created with email, role=USER, and createdAt", async () => {
    const ctx = createMockCtx({ subject: "users:new1", email: "alice@example.com" });

    // upsertUser is expected to be an internalMutation handler or similar
    // that accepts ctx and returns the user record.
    const user = await upsertUser(ctx as any, { email: "alice@example.com" });

    expect(user).toBeDefined();
    expect(user.email).toBe("alice@example.com");
    expect(user.role).toBe("USER");
    expect(typeof user.createdAt).toBe("number");
    expect(user.createdAt).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC 2: On subsequent logins, the existing user record is returned without
//        duplication
// ---------------------------------------------------------------------------
describe("AC 2: On subsequent logins, the existing user record is returned without duplication", () => {
  test("On subsequent logins, the existing user record is returned without duplication", async () => {
    const ctx = createMockCtx({ subject: "users:dup1", email: "bob@example.com" });

    const firstResult = await upsertUser(ctx as any, { email: "bob@example.com" });
    const secondResult = await upsertUser(ctx as any, { email: "bob@example.com" });

    // Should return the same record
    expect(secondResult._id).toBe(firstResult._id);
    expect(secondResult.email).toBe(firstResult.email);

    // Only one row should exist for this email
    const allRows = Array.from(ctx.db._rows.values()).filter(
      (r) => r.email === "bob@example.com",
    );
    expect(allRows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// AC 3: getUserByEmail helper is exported and reusable across all Convex
//        functions
// ---------------------------------------------------------------------------
describe("AC 3: getUserByEmail helper is exported and reusable across all Convex functions", () => {
  test("getUserByEmail returns user record when user exists", async () => {
    const ctx = createMockCtx(null);
    // Seed a user row
    const id = await ctx.db.insert("users", {
      email: "carol@example.com",
      role: "USER",
      createdAt: Date.now(),
    });

    const user = await getUserByEmail(ctx as any, "carol@example.com");

    expect(user).toBeDefined();
    expect(user!.email).toBe("carol@example.com");
  });

  test("getUserByEmail returns null for unknown email", async () => {
    const ctx = createMockCtx(null);

    const user = await getUserByEmail(ctx as any, "unknown@example.com");

    expect(user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC 4: requireAuth helper throws UNAUTHENTICATED if no identity and
//        USER_NOT_FOUND if no user record
// ---------------------------------------------------------------------------
describe("AC 4: requireAuth throws UNAUTHENTICATED if no identity and USER_NOT_FOUND if no user record", () => {
  test("requireAuth throws UNAUTHENTICATED when no identity is present", async () => {
    // Dynamically import to get the latest version
    const { requireAuth } = await import("../../convex/lib/auth");
    const ctx = createMockCtx(null);

    await expect(requireAuth(ctx as any)).rejects.toThrow();

    try {
      await requireAuth(ctx as any);
    } catch (err: any) {
      expect(err.data?.code).toBe("UNAUTHENTICATED");
    }
  });

  test("requireAuth throws USER_NOT_FOUND when identity exists but no user record", async () => {
    const { requireAuth } = await import("../../convex/lib/auth");
    // Identity is present but no user row in the DB
    const ctx = createMockCtx({ subject: "users:nonexistent", email: "ghost@example.com" });

    // The AC explicitly requires USER_NOT_FOUND — current impl falls back
    // to a minimal record instead, so this test will fail until fixed.
    await expect(requireAuth(ctx as any)).rejects.toThrow();

    try {
      await requireAuth(ctx as any);
    } catch (err: any) {
      expect(err.data?.code).toBe("USER_NOT_FOUND");
    }
  });

  test("requireAuth returns user record when identity and user row exist", async () => {
    const { requireAuth } = await import("../../convex/lib/auth");
    const ctx = createMockCtx({ subject: "users:existing1", email: "valid@example.com" });

    // Seed the user so db.get(subject) resolves
    ctx.db._rows.set("users:existing1", {
      _id: "users:existing1",
      email: "valid@example.com",
      role: "USER",
      createdAt: Date.now(),
    });

    const user = await requireAuth(ctx as any);

    expect(user).toBeDefined();
    expect(user.email).toBe("valid@example.com");
    expect(user.role).toBe("USER");
  });
});

// ---------------------------------------------------------------------------
// AC 5: Admin role check (user.role === 'ADMIN') is available as a helper
// ---------------------------------------------------------------------------
describe("AC 5: Admin role check is available as a helper", () => {
  test("isAdmin returns true for a user with role ADMIN", () => {
    const adminUser: UserRow = {
      _id: "users:admin1",
      email: "admin@example.com",
      role: "ADMIN",
      createdAt: Date.now(),
    };

    expect(isAdmin(adminUser)).toBe(true);
  });

  test("isAdmin returns false for a user with role USER", () => {
    const normalUser: UserRow = {
      _id: "users:regular1",
      email: "user@example.com",
      role: "USER",
      createdAt: Date.now(),
    };

    expect(isAdmin(normalUser)).toBe(false);
  });
});

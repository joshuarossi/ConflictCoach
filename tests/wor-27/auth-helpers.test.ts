/**
 * Unit tests for auth helpers (WOR-27, AC3, AC4 & AC5)
 *
 * AC3: getUserByEmail helper is exported and reusable across all Convex functions
 * AC4: requireAuth helper throws UNAUTHENTICATED if no identity and USER_NOT_FOUND if no user record
 * AC5: Admin role check (user.role === 'ADMIN') is available as a helper
 *
 * These tests will FAIL until the implementation is updated/created.
 */
import { describe, test, expect, vi } from "vitest";
import { ConvexError } from "convex/values";
import { requireAuth } from "../../convex/lib/auth";
import type { UserRecord } from "../../convex/lib/auth";

// @ts-expect-error WOR-27 red-state import: getUserByEmail is created by task-implement.
import { getUserByEmail } from "../../convex/lib/auth";

// @ts-expect-error WOR-27 red-state import: isAdmin is created by task-implement.
import { isAdmin } from "../../convex/lib/auth";

// ---------------------------------------------------------------------------
// Mock context helpers
// ---------------------------------------------------------------------------

const EXISTING_USER: UserRecord = {
  _id: "user_existing" as any,
  email: "existing@example.com",
  role: "USER",
  createdAt: 1700000000000,
};

const ADMIN_USER: UserRecord = {
  _id: "user_admin" as any,
  email: "admin@example.com",
  role: "ADMIN",
  createdAt: 1700000000000,
};

function createMockContext(options: {
  identity: { email: string; subject: string } | null;
  userRecord: UserRecord | null;
}) {
  return {
    auth: {
      getUserIdentity: vi.fn(async () =>
        options.identity
          ? {
              email: options.identity.email,
              subject: options.identity.subject,
              tokenIdentifier: `token_${options.identity.email}`,
            }
          : null,
      ),
    },
    db: {
      get: vi.fn(async (_id: string) => options.userRecord),
      query: vi.fn((table: string) => ({
        withIndex: (_name: string, predicate: (q: any) => unknown) => {
          const q = { eq: (_field: string, value: string) => value };
          const emailValue = predicate(q) as string;
          return {
            first: vi.fn(async () => {
              if (
                table === "users" &&
                options.userRecord?.email === emailValue
              ) {
                return options.userRecord;
              }
              return null;
            }),
          };
        },
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// AC 3: getUserByEmail helper is exported and reusable
// ---------------------------------------------------------------------------
describe("AC3: getUserByEmail helper", () => {
  test("getUserByEmail is a function", () => {
    expect(typeof getUserByEmail).toBe("function");
  });

  test("getUserByEmail returns the user record for a known email", async () => {
    const ctx = createMockContext({
      identity: null,
      userRecord: EXISTING_USER,
    });

    const user = await getUserByEmail(ctx, "existing@example.com");

    expect(user).toBeDefined();
    expect(user?.email).toBe("existing@example.com");
    expect(user?._id).toBe(EXISTING_USER._id);
  });

  test("getUserByEmail returns null for an unknown email", async () => {
    const ctx = createMockContext({
      identity: null,
      userRecord: null,
    });

    const user = await getUserByEmail(ctx, "unknown@example.com");

    expect(user).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC 4: requireAuth throws UNAUTHENTICATED if no identity
//        and USER_NOT_FOUND if no user record
// ---------------------------------------------------------------------------
describe("AC4: requireAuth error handling", () => {
  test("throws UNAUTHENTICATED when no identity is present", async () => {
    const ctx = createMockContext({
      identity: null,
      userRecord: null,
    });

    try {
      await requireAuth(ctx);
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("UNAUTHENTICATED");
    }
  });

  test("throws USER_NOT_FOUND when identity exists but no user record", async () => {
    const ctx = createMockContext({
      identity: { email: "ghost@example.com", subject: "subject_ghost" },
      userRecord: null,
    });

    try {
      await requireAuth(ctx);
      expect.unreachable("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("USER_NOT_FOUND");
    }
  });

  test("returns the user record when identity and user both exist", async () => {
    const ctx = createMockContext({
      identity: {
        email: EXISTING_USER.email,
        subject: EXISTING_USER._id as string,
      },
      userRecord: EXISTING_USER,
    });

    const user = await requireAuth(ctx);

    expect(user).toBeDefined();
    expect(user._id).toBe(EXISTING_USER._id);
    expect(user.email).toBe(EXISTING_USER.email);
    expect(user.role).toBe("USER");
  });
});

// ---------------------------------------------------------------------------
// AC 5: Admin role check is available as a helper
// ---------------------------------------------------------------------------
describe("AC5: Admin role check helper", () => {
  test("isAdmin is a function", () => {
    expect(typeof isAdmin).toBe("function");
  });

  test("isAdmin returns true for a user with role=ADMIN", () => {
    expect(isAdmin(ADMIN_USER)).toBe(true);
  });

  test("isAdmin returns false for a user with role=USER", () => {
    expect(isAdmin(EXISTING_USER)).toBe(false);
  });
});

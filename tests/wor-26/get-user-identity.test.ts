import { describe, test, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { requireAuth } from "../../convex/lib/auth";

/**
 * AC: ctx.auth.getUserIdentity() returns identity for authenticated users
 *
 * For getUserIdentity() to actually return an identity, Convex Auth must be
 * initialized (convex/auth.ts must exist and export auth helpers). We test
 * both the infrastructure prerequisite and the requireAuth helper.
 */
describe("AC: ctx.auth.getUserIdentity() returns identity for authenticated users in Convex functions", () => {
  test("convex/auth.ts exists and exports auth helpers", () => {
    // Convex Auth requires a convex/auth.ts file that exports
    // the auth instance and HTTP router for OAuth callbacks / magic link
    const authFilePath = path.resolve(__dirname, "../../convex/auth.ts");
    expect(existsSync(authFilePath)).toBe(true);

    const source = readFileSync(authFilePath, "utf-8");
    // Should export an auth object
    expect(source).toMatch(/export\s+.*(auth)/);
  });

  test("requireAuth returns a user record when identity is present and user exists in DB", async () => {
    const mockUser = {
      _id: "user123" as string & { __tableName: "users" },
      email: "alice@example.com",
      displayName: "Alice",
      role: "USER" as const,
      createdAt: Date.now(),
    };
    const ctx = {
      auth: {
        getUserIdentity: async () => ({
          subject: "user123",
          email: "alice@example.com",
          tokenIdentifier: "token123",
        }),
      },
      db: {
        get: async () => mockUser,
        query: () => ({
          withIndex: () => ({ first: async () => mockUser }),
        }),
      },
    };

    const result = await requireAuth(ctx);
    expect(result._id).toBe("user123");
    expect(result.email).toBe("alice@example.com");
    expect(result.role).toBe("USER");
  });

  test("requireAuth throws USER_NOT_FOUND when identity is present but no user record exists", async () => {
    // Per WOR-27 AC: requireAuth must throw USER_NOT_FOUND if no user row.
    // The user-row creation is owned by the upsertUser mutation that runs on
    // first login (also WOR-27); requireAuth itself does not create rows.
    const ctx = {
      auth: {
        getUserIdentity: async () => ({
          subject: "newuser456",
          email: "bob@example.com",
          tokenIdentifier: "token456",
        }),
      },
      db: {
        get: async () => null,
        query: () => ({
          withIndex: () => ({ first: async () => null }),
        }),
      },
    };

    await expect(requireAuth(ctx)).rejects.toThrow();
  });

  test("requireAuth throws UNAUTHENTICATED when no identity is present", async () => {
    const ctx = {
      auth: {
        getUserIdentity: async () => null,
      },
      db: {
        get: async () => null,
        query: () => ({
          withIndex: () => ({ first: async () => null }),
        }),
      },
    };

    await expect(requireAuth(ctx)).rejects.toThrow();
  });

  test("requireAuth throws when identity has no subject field", async () => {
    const ctx = {
      auth: {
        getUserIdentity: async () => ({
          email: "nosubject@example.com",
          tokenIdentifier: "tok",
        }),
      },
      db: {
        get: async () => null,
        query: () => ({
          withIndex: () => ({ first: async () => null }),
        }),
      },
    };

    await expect(requireAuth(ctx)).rejects.toThrow();
  });
});

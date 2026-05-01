/**
 * WOR-64 AC2: Creates one admin user with role=ADMIN if not already present
 *
 * After running the seed action, exactly one user with role=ADMIN should
 * exist in the users table.
 */
import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  createMockActionContext,
  callHandler,
  importSeedModule,
  getSeedHandler,
  type MockUser,
} from "./helpers";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
});

describe("AC2: Creates admin user with role=ADMIN", () => {
  test("creates an admin user in an empty database", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const users = getTable<MockUser>("users");
    const admins = users.filter((u) => u.role === "ADMIN");

    expect(admins).toHaveLength(1);
    expect(admins[0].role).toBe("ADMIN");
    expect(admins[0].email).toBeDefined();
    expect(typeof admins[0].email).toBe("string");
    expect(admins[0].email.length).toBeGreaterThan(0);
  });

  test("admin user has a createdAt timestamp", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const users = getTable<MockUser>("users");
    const admin = users.find((u) => u.role === "ADMIN");

    expect(admin).toBeDefined();
    expect(typeof admin!.createdAt).toBe("number");
    expect(admin!.createdAt).toBeGreaterThan(0);
  });

  test("does not create admin if one already exists with same email", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);

    const existingAdmin: MockUser = {
      _id: "users_existing_admin",
      email: "admin@conflictcoach.dev",
      role: "ADMIN",
      createdAt: 1700000000000,
    };

    const { ctx, getTable } = createMockActionContext({
      users: [existingAdmin],
    });

    await callHandler(handler, ctx);

    const users = getTable<MockUser>("users");
    const admins = users.filter((u) => u.role === "ADMIN");

    // Should still be exactly one admin — no duplicate created
    expect(admins).toHaveLength(1);
    expect(admins[0]._id).toBe("users_existing_admin");
  });
});

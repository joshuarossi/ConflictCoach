/**
 * WOR-64 AC5: Idempotent — running twice does not create duplicates
 *
 * Running the seed action twice against the same database should result
 * in exactly 1 admin user and 5 templates with 5 versions — no duplicates.
 * (Count went from 3 to 5 when contractual + other categories were added
 * to align with VALID_CATEGORIES in cases/create.ts.)
 */
import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  createMockActionContext,
  callHandler,
  importSeedModule,
  getSeedHandler,
  type MockUser,
  type MockTemplate,
  type MockTemplateVersion,
} from "./helpers";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
});

describe("AC5: Idempotent — no duplicates on repeated runs", () => {
  test("running seed twice produces exactly 1 admin user", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);
    await callHandler(handler, ctx);

    const users = getTable<MockUser>("users");
    const admins = users.filter((u) => u.role === "ADMIN");

    expect(admins).toHaveLength(1);
  });

  test("running seed twice produces exactly 5 templates", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);
    await callHandler(handler, ctx);

    const templates = getTable<MockTemplate>("templates");
    expect(templates).toHaveLength(5);
  });

  test("running seed twice produces exactly 5 template versions", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);
    await callHandler(handler, ctx);

    const versions = getTable<MockTemplateVersion>("templateVersions");
    expect(versions).toHaveLength(5);
  });

  test("running seed three times still produces no duplicates", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);
    await callHandler(handler, ctx);
    await callHandler(handler, ctx);

    const users = getTable<MockUser>("users");
    const templates = getTable<MockTemplate>("templates");
    const versions = getTable<MockTemplateVersion>("templateVersions");

    expect(users.filter((u) => u.role === "ADMIN")).toHaveLength(1);
    expect(templates).toHaveLength(5);
    expect(versions).toHaveLength(5);
  });
});

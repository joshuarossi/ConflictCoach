/**
 * WOR-64 AC1: convex/seed.ts is callable from the Convex dashboard
 *
 * Verifies that the seed module exports a Convex function (action or
 * internalMutation) with a handler. Both action and internalMutation
 * are callable from the Convex dashboard in development environments.
 *
 * The seed logic tests (AC2-AC6) exercise the handler directly with a
 * ctx.db mock. This file validates the Convex export shape only.
 */
import { describe, test, expect } from "vitest";
import { importSeedModule } from "./helpers";

describe("AC1: seed.ts exports a callable Convex function", () => {
  test("seed module exists and has exports", async () => {
    const seedModule = await importSeedModule();
    const exportKeys = Object.keys(seedModule);
    expect(exportKeys.length).toBeGreaterThan(0);
  });

  test("the seed export has a handler function (Convex action or internalMutation shape)", async () => {
    const seedModule = await importSeedModule();

    // Convex functions export objects with a .handler property
    const seedFn =
      seedModule.seed ?? seedModule.default ?? Object.values(seedModule)[0];

    expect(seedFn).toBeDefined();

    if (typeof seedFn === "function") {
      expect(typeof seedFn).toBe("function");
    } else {
      // Object with .handler — standard Convex pattern (action or internalMutation)
      expect(seedFn).toHaveProperty("handler");
      expect(
        typeof (seedFn as { handler: unknown }).handler,
      ).toBe("function");
    }
  });
});

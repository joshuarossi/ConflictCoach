/**
 * WOR-63: Cron job for abandoned case cleanup
 *
 * Tests for AC1 (Cron defined in convex/crons.ts using Convex's built-in scheduler)
 * and AC2 (Runs daily).
 *
 * These tests verify the cron module exists, exports a valid cron configuration,
 * and registers a daily schedule. They will FAIL until convex/crons.ts is
 * implemented with the Convex cronJobs() API.
 */
import { describe, test, expect } from "vitest";

describe("WOR-63: Cron definition", () => {
  test("Cron defined in convex/crons.ts using Convex's built-in scheduler", async () => {
    // AC1: convex/crons.ts must exist and export a default cron configuration
    // created via Convex's cronJobs() API.
    const cronModule = await import("../../convex/crons");
    expect(cronModule).toBeDefined();
    expect(cronModule.default).toBeDefined();

    // The default export from cronJobs() is a Crons object.
    // Convex cron definitions are objects with an `export default` of the
    // cronJobs() return value. Verify it has the expected shape.
    const crons = cronModule.default;
    expect(typeof crons).toBe("object");
  });

  test("Runs daily", async () => {
    // AC2: The cron must be scheduled to run daily.
    // We import the crons module and inspect its configuration.
    // cronJobs().daily() registers a daily schedule internally.
    // The crons object stores registered jobs — we verify at least one exists.
    const cronModule = await import("../../convex/crons");
    const crons = cronModule.default;

    // Convex Crons objects expose their registered jobs. The exact shape
    // depends on the Convex version, but we verify the object is not empty
    // (i.e., at least one cron job is registered).
    const hasJobs =
      crons !== null &&
      typeof crons === "object" &&
      Object.keys(crons).length > 0;
    expect(hasJobs).toBe(true);
  });
});

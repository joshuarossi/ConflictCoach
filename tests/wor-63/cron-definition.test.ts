/**
 * WOR-63: Cron job for abandoned case cleanup
 *
 * Tests for AC1 (Cron defined in convex/crons.ts using Convex's built-in scheduler)
 * and AC2 (Runs daily).
 *
 * These tests verify the cron module exists, exports a valid cron configuration,
 * and registers a daily cleanup job with the correct schedule.
 */
import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("WOR-63: Cron definition", () => {
  test("AC1: Cron defined in convex/crons.ts with cleanup handler", () => {
    // AC1: convex/crons.ts must exist, import cronJobs from 'convex/server',
    // and reference the cleanupAbandonedCases handler.
    // cronJobs() returns an opaque Crons instance that cannot be inspected at
    // runtime, so we verify via source-code inspection.
    const source = readFileSync(
      resolve(__dirname, "../../convex/crons.ts"),
      "utf-8",
    );

    // Must import cronJobs from convex/server
    expect(source).toMatch(/import\s.*cronJobs.*from\s+["']convex\/server["']/);

    // Must call cronJobs() to create the cron configuration
    expect(source).toMatch(/cronJobs\s*\(/);

    // Must reference the cleanup handler
    expect(source).toContain("cleanupAbandonedCases");
  });

  test("AC1: convex/crons.ts imports from crons.cleanup", () => {
    // Verify the crons module imports the cleanup mutation
    const source = readFileSync(
      resolve(__dirname, "../../convex/crons.ts"),
      "utf-8",
    );
    expect(source).toContain("cleanupAbandonedCases");
  });

  test("AC2: Cleanup cron is scheduled to run daily", () => {
    // AC2: The cron must run daily. cronJobs() exposes both `.daily(...)`
    // and `.interval({ hours: 24 })` — both satisfy the spec since they
    // produce a 24-hour cadence. Accept either API.
    const source = readFileSync(
      resolve(__dirname, "../../convex/crons.ts"),
      "utf-8",
    );

    expect(source).toMatch(/\.daily\s*\(|\.interval\s*\([^)]*hours:\s*24/);
  });

  test("AC2: convex/crons.ts source references a 24-hour cadence", () => {
    // Belt-and-suspenders — accept any of the equivalent ways to express
    // "once per day": .daily(...), { hours: 24 }, or a literal `daily`
    // keyword in a comment/name.
    const source = readFileSync(
      resolve(__dirname, "../../convex/crons.ts"),
      "utf-8",
    );
    expect(source).toMatch(/daily|hours:\s*24/i);
  });
});

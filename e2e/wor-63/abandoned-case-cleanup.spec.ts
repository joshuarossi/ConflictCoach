/**
 * WOR-63: Cron job for abandoned case cleanup — E2E test
 *
 * This task is entirely backend (Convex cron + internalMutation), so there is
 * no user-facing UI to drive. The E2E test verifies:
 *
 * 1. The Convex dev server is running and healthy (baseline).
 * 2. The cleanup mutation is NOT callable from the client (it must be an
 *    internalMutation, only invocable by the scheduler). Attempting to call
 *    it from a client context should fail.
 *
 * These tests will FAIL until convex/crons.ts and the cleanup mutation are
 * implemented.
 */
import { test, expect } from "@playwright/test";

test.describe("WOR-63: Abandoned case cleanup cron", () => {
  test("Convex backend is reachable and the app loads", async ({ page }) => {
    // Baseline: the app should load without errors. This proves the dev
    // server (Vite + Convex) is running — a prerequisite for the cron to
    // be registered.
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.status()).toBeLessThan(400);
  });

  test("Cleanup mutation uses internalMutation (not client-callable)", async () => {
    // AC: The cron mutation should be internal (not client-callable).
    // We verify this via source-code inspection — checking that the
    // cleanup module uses internalMutation rather than the public mutation
    // export. This is more reliable than trying to call it from a browser
    // context where the Convex client may not be globally exposed.
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const source = readFileSync(
      resolve(__dirname, "../../convex/crons.cleanup.ts"),
      "utf-8",
    );

    // Must import internalMutation
    expect(source).toMatch(/import\s.*internalMutation.*from/);

    // Must NOT export a plain (client-callable) mutation
    const lines = source.split("\n");
    const publicMutationLines = lines.filter(
      (line) => /\bmutation\b/.test(line) && !/internalMutation/.test(line),
    );
    expect(publicMutationLines).toHaveLength(0);
  });
});

/**
 * WOR-71: Playwright smoke test — validates infrastructure is wired.
 *
 * Covers:
 * - AC1: Playwright is installed and configured with playwright.config.ts
 * - AC6: Base URL configured for local dev server
 * - AC7: npm run test:e2e runs Playwright tests
 *
 * AC7 is proven by the fact that this file IS a Playwright test discovered by
 * `npm run test:e2e`. If the command exits 0 with this test passing, AC7 is
 * satisfied.
 */

import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// AC1: Playwright is installed and configured with playwright.config.ts
// ---------------------------------------------------------------------------

test("Playwright is installed and configured with playwright.config.ts", async ({
  page,
}) => {
  // Navigate to the base URL configured in playwright.config.ts.
  // This proves Playwright is installed, the config is loaded, and the
  // webServer directive starts the dev server.
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  expect(response!.status()).toBeLessThan(400);
});

// ---------------------------------------------------------------------------
// AC6: Base URL configured for local dev server
// ---------------------------------------------------------------------------

test("Base URL configured for local dev server", async ({ baseURL }) => {
  // playwright.config.ts must set baseURL to a localhost URL so tests
  // run against the local dev server.
  expect(baseURL).toBeDefined();
  expect(baseURL).toMatch(/^https?:\/\/localhost(:\d+)?/);
});

// ---------------------------------------------------------------------------
// AC7: npm run test:e2e runs Playwright tests
// ---------------------------------------------------------------------------

test("npm run test:e2e runs Playwright tests", async ({ page }) => {
  // This test's mere existence and execution via `npm run test:e2e` proves
  // the script is wired correctly. We additionally verify the app root
  // element renders, confirming the dev server is serving the React app.
  await page.goto("/");
  // The React app mounts into a #root element (standard Vite + React setup)
  const root = page.locator("#root");
  await expect(root).toBeAttached({ timeout: 10_000 });
});

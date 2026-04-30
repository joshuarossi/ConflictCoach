/**
 * WOR-71 — AC: Playwright is installed and configured with playwright.config.ts
 * WOR-71 — AC: Base URL configured for local dev server
 *
 * Trivial smoke test: navigate to the base URL and assert the page loads
 * with a 200 response. Proves Playwright is wired and the dev server starts.
 */
import { test, expect } from "@playwright/test";

test("Playwright is installed and configured with playwright.config.ts", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  expect(response!.status()).toBe(200);
});

test("Base URL configured for local dev server", async ({ page }) => {
  // The baseURL in playwright.config.ts should point to the local dev server.
  // Navigating to "/" resolves against that baseURL.
  await page.goto("/");
  const url = page.url();
  expect(url).toMatch(/localhost/);
});

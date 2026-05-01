import { test, expect } from "@playwright/test";

/**
 * WOR-71 AC: Playwright is installed and configured with playwright.config.ts
 * WOR-71 AC: Base URL configured for local dev server
 * WOR-71 AC: npm run test:e2e runs Playwright tests
 *
 * This smoke test validates that the Playwright infrastructure is wired:
 * the dev server starts, the base URL is reachable, and the app serves HTML.
 */

test.describe("AC: Playwright E2E infrastructure smoke test", () => {
  test("dev server responds at the configured base URL", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("app serves an HTML document with a root element", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html).toContain("<!DOCTYPE html>");
    // The React app mounts into a root div
    const root = page.locator("#root");
    await expect(root).toBeAttached();
  });
});

import { test, expect } from "@playwright/test";

/**
 * AC: Running `npm install && npm run dev` starts the Vite dev server without errors.
 *
 * Playwright's webServer config (in playwright.config.ts) runs `npm run dev`
 * before these tests execute. If the dev server fails to start within the
 * timeout, the test suite itself will fail — proving the AC.
 */
test.describe("AC: Vite dev server starts and serves the app", () => {
  test("Running `npm install && npm run dev` starts the Vite dev server without errors", async ({
    page,
  }) => {
    const response = await page.goto("/");

    // The dev server should respond with a 200 status
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);

    // The response should be HTML containing the React root element
    const html = await page.content();
    expect(html).toContain("<div id=\"root\"");
  });

  test("React Router placeholder route at / renders content", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for React to hydrate / render — the root div should have children
    const root = page.locator("#root");
    await expect(root).not.toBeEmpty();
  });
});

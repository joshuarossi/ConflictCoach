import { test, expect } from "@playwright/test";

test.describe("AC: Running npm install && npm run dev starts the Vite dev server without errors", () => {
  test("Vite dev server serves a page at / with a 200 response", async ({
    page,
  }) => {
    const response = await page.goto("/");

    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("the served page contains a root element for React to mount into", async ({
    page,
  }) => {
    await page.goto("/");

    // Vite React apps mount into a #root div
    const root = page.locator("#root");
    await expect(root).toBeAttached();
  });

  test("the page renders visible content (not a blank screen)", async ({
    page,
  }) => {
    await page.goto("/");

    // Wait for React to hydrate — there should be some visible text
    await expect(page.locator("body")).not.toBeEmpty();

    // The #root should have children (React rendered something)
    const rootChildren = await page.locator("#root > *").count();
    expect(rootChildren).toBeGreaterThan(0);
  });
});

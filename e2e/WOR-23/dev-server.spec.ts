import { test, expect } from "@playwright/test";

test.describe("AC: Running npm install && npm run dev starts the Vite dev server without errors", () => {
  test("Vite dev server responds with 200 at http://localhost:5173/", async ({
    page,
  }) => {
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("Vite dev server serves an HTML page with a root element", async ({
    page,
  }) => {
    await page.goto("/");
    // Vite React apps mount into a #root div
    const root = page.locator("#root");
    await expect(root).toBeAttached();
  });

  test("Page renders without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    // Give the app a moment to initialize
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });
});

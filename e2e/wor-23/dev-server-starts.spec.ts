import { test, expect } from "@playwright/test";

test.describe("AC: Running npm install && npm run dev starts the Vite dev server without errors", () => {
  test("Vite dev server responds with 200 at http://localhost:5173/", async ({
    page,
  }) => {
    // Playwright config starts `npm run dev` via webServer before this test runs.
    // If the dev server fails to start, this test will time out.
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
  });

  test("Vite dev server serves HTML content", async ({ page }) => {
    await page.goto("/");
    // The page should contain an HTML document with a root element
    const html = await page.content();
    expect(html).toContain("<!DOCTYPE html>");
  });
});

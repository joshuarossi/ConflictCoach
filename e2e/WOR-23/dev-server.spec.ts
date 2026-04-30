import { test, expect } from "@playwright/test";

test("Running `npm install && npm run dev` starts the Vite dev server without errors", async ({
  page,
}) => {
  // Playwright config starts the dev server via webServer.command = "npm run dev".
  // If the server fails to start, this test never runs (Playwright aborts).
  // Visiting "/" and asserting a 200 proves the server is up and serving HTML.
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  expect(response!.status()).toBe(200);

  // Verify the response is HTML (not an error page or empty body)
  const contentType = response!.headers()["content-type"] ?? "";
  expect(contentType).toContain("text/html");

  // Verify the page has a root element (React mounts here)
  const root = page.locator("#root");
  await expect(root).toBeAttached();
});

import { test, expect } from "@playwright/test";

/**
 * AC: Dark mode token variants are defined and toggle via
 * prefers-color-scheme or a data-theme attribute
 *
 * This E2E test verifies that when the browser prefers dark mode,
 * the computed background color of the page changes from the light
 * theme value to the dark theme value.
 */
test.describe("AC: Dark mode token variants toggle via prefers-color-scheme or data-theme", () => {
  test("light mode applies light --bg-canvas value (#FAF8F5)", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--bg-canvas").trim();
    });

    // Light mode canvas should be the warm off-white (#FAF8F5)
    expect(bgColor).toBeTruthy();
    // The value should not be the dark mode value
    expect(bgColor.toLowerCase()).not.toContain("1a1816");
  });

  test("dark mode applies dark --bg-canvas value when prefers-color-scheme is dark", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--bg-canvas").trim();
    });

    // Dark mode canvas should be #1A1816 (per style guide)
    expect(bgColor).toBeTruthy();
    expect(bgColor.toLowerCase()).toContain("1a1816");
  });

  test("dark mode changes --text-primary to light color", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    const textColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--text-primary").trim();
    });

    expect(textColor).toBeTruthy();
    // Dark mode text-primary should be #F2EFE9
    expect(textColor.toLowerCase()).toContain("f2efe9");
  });

  test("data-theme=\"dark\" attribute also activates dark mode tokens", async ({ page }) => {
    // Use light system preference but set data-theme to dark
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });

    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue("--bg-canvas").trim();
    });

    expect(bgColor).toBeTruthy();
    // Should use dark mode value when data-theme="dark" is set
    expect(bgColor.toLowerCase()).toContain("1a1816");
  });
});

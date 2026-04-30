import { test, expect } from "@playwright/test";

/**
 * AC: Inter (400/500/600) and JetBrains Mono (400/500) are loaded
 *
 * This E2E test loads the app and checks that the required fonts
 * are available in the browser via document.fonts API.
 */
test.describe("AC: Inter (400/500/600) and JetBrains Mono (400/500) are loaded", () => {
  test("Inter font is available at weight 400", async ({ page }) => {
    await page.goto("/");
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);

    const loaded = await page.evaluate(() =>
      document.fonts.check("400 16px Inter"),
    );
    expect(loaded, "Inter 400 must be loaded").toBe(true);
  });

  test("Inter font is available at weight 500", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const loaded = await page.evaluate(() =>
      document.fonts.check("500 16px Inter"),
    );
    expect(loaded, "Inter 500 must be loaded").toBe(true);
  });

  test("Inter font is available at weight 600", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const loaded = await page.evaluate(() =>
      document.fonts.check("600 16px Inter"),
    );
    expect(loaded, "Inter 600 must be loaded").toBe(true);
  });

  test("JetBrains Mono font is available at weight 400", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const loaded = await page.evaluate(() =>
      document.fonts.check("400 16px 'JetBrains Mono'"),
    );
    expect(loaded, "JetBrains Mono 400 must be loaded").toBe(true);
  });

  test("JetBrains Mono font is available at weight 500", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const loaded = await page.evaluate(() =>
      document.fonts.check("500 16px 'JetBrains Mono'"),
    );
    expect(loaded, "JetBrains Mono 500 must be loaded").toBe(true);
  });
});

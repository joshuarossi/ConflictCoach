import { test, expect } from "@playwright/test";

/**
 * AC: Font smoothing is set globally per StyleGuide §3.4
 *
 * StyleGuide §3.4 requires:
 *   -webkit-font-smoothing: antialiased;
 *   -moz-osx-font-smoothing: grayscale;
 * set on the html element globally.
 */
test.describe("AC: Font smoothing is set globally per StyleGuide §3.4", () => {
  test("-webkit-font-smoothing is set to antialiased on the html element", async ({
    page,
  }) => {
    await page.goto("/");

    const smoothing = await page.evaluate(() => {
      // @ts-expect-error -- webkitFontSmoothing is a non-standard property
      return (
        getComputedStyle(document.documentElement).webkitFontSmoothing ||
        getComputedStyle(document.documentElement).getPropertyValue(
          "-webkit-font-smoothing",
        )
      );
    });

    expect(smoothing).toBe("antialiased");
  });

  test("font-smoothing styles are present in the loaded CSS", async ({
    page,
  }) => {
    await page.goto("/");

    // Verify that the CSS contains font-smoothing declarations
    const hasSmoothing = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (const rule of rules) {
            if (rule.cssText.includes("font-smoothing")) {
              return true;
            }
          }
        } catch {
          // Cross-origin stylesheets may throw
        }
      }
      return false;
    });

    expect(hasSmoothing, "CSS must include font-smoothing declarations").toBe(
      true,
    );
  });
});

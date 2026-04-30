import { describe, test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Implementation note requires a src/lib/theme.ts file that exposes tokens
 * programmatically for components needing computed style access.
 * This test verifies it exists and exports token values.
 */
describe("theme.ts module exposes design tokens programmatically", () => {
  const themePath = path.resolve(__dirname, "../../src/lib/theme.ts");

  test("src/lib/theme.ts exists", () => {
    expect(fs.existsSync(themePath)).toBe(true);
  });

  test("theme.ts exports color token values", async () => {
    const theme = await import("../../src/lib/theme.ts");

    // Should export color tokens in some form (object, const, etc.)
    const exports = Object.keys(theme);
    expect(
      exports.length,
      "theme.ts should export at least one named export",
    ).toBeGreaterThan(0);

    // Look for color-related exports
    const allValues = JSON.stringify(theme);
    expect(
      allValues,
      "theme.ts exports should reference design token values or CSS var names",
    ).toMatch(/canvas|accent|primary|surface/i);
  });
});

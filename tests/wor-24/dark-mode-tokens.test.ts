import { describe, test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * AC: Dark mode token variants are defined and toggle via
 * prefers-color-scheme or a data-theme attribute
 */
describe("AC: Dark mode token variants are defined and toggle via prefers-color-scheme or a data-theme attribute", () => {
  const globalsPath = path.resolve(__dirname, "../../src/globals.css");

  let cssContent: string;

  test("globals.css exists", () => {
    expect(fs.existsSync(globalsPath)).toBe(true);
  });

  test("globals.css contains a dark mode selector (prefers-color-scheme: dark or [data-theme=\"dark\"])", () => {
    cssContent = fs.readFileSync(globalsPath, "utf-8");

    const hasPrefersColorScheme = cssContent.includes("prefers-color-scheme: dark");
    const hasDataTheme = /\[data-theme\s*=\s*["']dark["']\]/.test(cssContent);

    expect(
      hasPrefersColorScheme || hasDataTheme,
      "globals.css must contain either @media (prefers-color-scheme: dark) or [data-theme=\"dark\"] selector",
    ).toBe(true);
  });

  test("dark mode block redefines key color tokens with different values", () => {
    cssContent = fs.readFileSync(globalsPath, "utf-8");

    // Find the dark mode block — either inside @media or [data-theme="dark"]
    const darkBlockRegex = /(?:@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)|\[data-theme\s*=\s*["']dark["']\])\s*\{[\s\S]*?\}/;
    const darkBlock = cssContent.match(darkBlockRegex);

    expect(darkBlock, "No dark mode block found in globals.css").toBeTruthy();

    const block = darkBlock![0];

    // These tokens must have dark mode overrides per the style guide
    const darkTokens = [
      "--bg-canvas",
      "--bg-surface",
      "--text-primary",
      "--accent",
      "--coach-accent",
      "--private-tint",
    ];

    for (const token of darkTokens) {
      expect(
        block,
        `Dark mode block missing override for ${token}`,
      ).toContain(token);
    }
  });
});

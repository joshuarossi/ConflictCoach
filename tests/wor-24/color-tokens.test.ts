import { describe, test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * AC: All color tokens from StyleGuide §2.2 are defined as CSS custom properties
 * in globals.css (including --bg-canvas, --bg-surface, --bg-surface-subtle,
 * --text-primary, --text-secondary, --text-tertiary, --accent, --accent-hover,
 * --accent-subtle, --danger, --danger-subtle, --warning, --border-default,
 * --border-strong, --coach-accent, --private-tint)
 */
describe("AC: All color tokens from StyleGuide §2.2 are defined as CSS custom properties in globals.css", () => {
  const globalsPath = path.resolve(__dirname, "../../src/globals.css");

  const REQUIRED_COLOR_TOKENS = [
    "--bg-canvas",
    "--bg-surface",
    "--bg-surface-subtle",
    "--text-primary",
    "--text-secondary",
    "--text-tertiary",
    "--accent",
    "--accent-hover",
    "--accent-subtle",
    "--danger",
    "--danger-subtle",
    "--warning",
    "--border-default",
    "--border-strong",
    "--coach-accent",
    "--private-tint",
  ] as const;

  let cssContent: string;

  test("globals.css exists at src/globals.css", () => {
    expect(fs.existsSync(globalsPath)).toBe(true);
  });

  test("globals.css contains all 16 required color tokens as CSS custom properties", () => {
    cssContent = fs.readFileSync(globalsPath, "utf-8");

    for (const token of REQUIRED_COLOR_TOKENS) {
      expect(
        cssContent,
        `Missing CSS custom property: ${token}`,
      ).toContain(token);
    }
  });

  test("each color token has a value assigned (not just referenced)", () => {
    cssContent = fs.readFileSync(globalsPath, "utf-8");

    for (const token of REQUIRED_COLOR_TOKENS) {
      // Match pattern like `--bg-canvas: #FAF8F5` or `--bg-canvas: something`
      const declarationRegex = new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*.+`);
      expect(
        cssContent,
        `Token ${token} is not declared with a value`,
      ).toMatch(declarationRegex);
    }
  });
});

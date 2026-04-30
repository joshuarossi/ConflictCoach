/**
 * WOR-71 — AC: Playwright is installed and configured with playwright.config.ts
 * WOR-71 — AC: Base URL configured for local dev server
 * WOR-71 — AC: npm run test:e2e runs Playwright tests
 *
 * These tests validate that the Playwright infrastructure is properly wired:
 * config file exists, base URL points to local dev, and the npm script is present.
 */
import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "../..");

describe("Playwright is installed and configured with playwright.config.ts", () => {
  test("playwright.config.ts exists at the project root", () => {
    const configPath = path.join(ROOT, "playwright.config.ts");
    expect(fs.existsSync(configPath)).toBe(true);
  });

  test("@playwright/test is listed in devDependencies", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"),
    );
    expect(pkg.devDependencies).toHaveProperty("@playwright/test");
  });

  test("playwright.config.ts sets testDir to ./e2e", async () => {
    const configContent = fs.readFileSync(
      path.join(ROOT, "playwright.config.ts"),
      "utf-8",
    );
    expect(configContent).toContain("testDir");
    expect(configContent).toMatch(/e2e/);
  });
});

describe("Base URL configured for local dev server", () => {
  test("playwright.config.ts contains a baseURL pointing to localhost", () => {
    const configContent = fs.readFileSync(
      path.join(ROOT, "playwright.config.ts"),
      "utf-8",
    );
    expect(configContent).toMatch(/baseURL.*localhost/);
  });
});

describe("npm run test:e2e runs Playwright tests", () => {
  test('package.json has a "test:e2e" script that invokes playwright', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"),
    );
    expect(pkg.scripts).toHaveProperty("test:e2e");
    expect(pkg.scripts["test:e2e"]).toMatch(/playwright/i);
  });
});

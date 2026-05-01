import { describe, test, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * WOR-71 AC: Playwright is installed and configured with playwright.config.ts
 * WOR-71 AC: Base URL configured for local dev server
 */

const ROOT = path.resolve(__dirname, "../..");

describe("AC: Playwright is installed and configured with playwright.config.ts", () => {
  test("playwright.config.ts exists at the project root", () => {
    const configPath = path.join(ROOT, "playwright.config.ts");
    expect(fs.existsSync(configPath)).toBe(true);
  });

  test("@playwright/test is listed as a devDependency in package.json", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"),
    );
    expect(pkg.devDependencies).toHaveProperty("@playwright/test");
  });
});

describe("AC: Base URL configured for local dev server", () => {
  test("playwright.config.ts configures baseURL pointing to localhost", async () => {
    const configContent = fs.readFileSync(
      path.join(ROOT, "playwright.config.ts"),
      "utf-8",
    );
    // Config should reference a localhost URL for local dev
    expect(configContent).toMatch(/baseURL:\s*["']http:\/\/localhost:\d+["']/);
  });

  test("playwright.config.ts sets testDir to e2e/", async () => {
    const configContent = fs.readFileSync(
      path.join(ROOT, "playwright.config.ts"),
      "utf-8",
    );
    expect(configContent).toMatch(/testDir:\s*["']\.\/e2e["']/);
  });

  test("playwright.config.ts configures a webServer command", async () => {
    const configContent = fs.readFileSync(
      path.join(ROOT, "playwright.config.ts"),
      "utf-8",
    );
    expect(configContent).toMatch(/webServer/);
    expect(configContent).toMatch(/command/);
  });
});

describe("AC: npm run test:e2e runs Playwright tests", () => {
  test("package.json has a test:e2e script that runs playwright", () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"),
    );
    expect(pkg.scripts).toHaveProperty("test:e2e");
    expect(pkg.scripts["test:e2e"]).toMatch(/playwright/);
  });
});

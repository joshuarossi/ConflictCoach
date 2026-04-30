import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { resolve } from "path";

test.describe("AC: ESLint and Prettier configs are present and npm run lint passes", () => {
  test("npm run lint exits with code 0", () => {
    const root = resolve(__dirname, "../..");
    // execSync throws on non-zero exit code, which would fail the test.
    const result = execSync("npm run lint", {
      cwd: root,
      encoding: "utf-8",
      timeout: 30000,
    });
    // If we get here, lint passed (exit code 0)
    expect(result).toBeDefined();
  });
});

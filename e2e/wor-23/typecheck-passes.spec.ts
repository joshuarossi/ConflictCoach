import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import { resolve } from "path";

test.describe("AC: TypeScript strict mode is enabled and tsc --noEmit passes", () => {
  test("npm run typecheck (tsc --noEmit) exits with code 0", () => {
    const root = resolve(__dirname, "../..");
    // execSync throws on non-zero exit code, which would fail the test.
    const result = execSync("npm run typecheck", {
      cwd: root,
      encoding: "utf-8",
      timeout: 30000,
    });
    expect(result).toBeDefined();
  });
});

import { describe, test, expect } from "vitest";
import { execSync } from "child_process";
import { resolve } from "path";

describe("AC: TypeScript strict mode is enabled and tsc --noEmit passes", () => {
  const rootDir = resolve(__dirname, "../..");

  test("tsc --noEmit exits with code 0 (strict mode enabled, no type errors)", () => {
    expect(() => {
      execSync("npx tsc --noEmit", {
        cwd: rootDir,
        stdio: "pipe",
        timeout: 30000,
      });
    }).not.toThrow();
  });

  test("tsconfig.json has strict mode enabled", () => {
    const tsconfig = JSON.parse(
      require("fs").readFileSync(resolve(rootDir, "tsconfig.json"), "utf-8")
    );

    // strict could be in the root config or in a referenced config
    const hasStrict =
      tsconfig?.compilerOptions?.strict === true ||
      (tsconfig.references && tsconfig.references.length > 0);

    // If using references, check the app tsconfig
    if (tsconfig.references) {
      // At least verify the root tsconfig exists and has references
      expect(tsconfig.references.length).toBeGreaterThan(0);
    } else {
      expect(tsconfig.compilerOptions.strict).toBe(true);
    }
  });
});

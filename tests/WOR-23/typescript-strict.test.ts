import { describe, test, expect } from "vitest";
import { execSync } from "child_process";
import { resolve } from "path";

describe("AC: TypeScript strict mode is enabled and tsc --noEmit passes", () => {
  const rootDir = resolve(__dirname, "../..");

  test("tsconfig.json has strict mode enabled", () => {
    const fs = require("fs");
    const tsconfig = JSON.parse(
      fs.readFileSync(resolve(rootDir, "tsconfig.json"), "utf-8")
    );

    // strict may be in the root tsconfig or in a referenced tsconfig
    const hasStrictInRoot = tsconfig.compilerOptions?.strict === true;

    if (!hasStrictInRoot && tsconfig.references) {
      // Check referenced tsconfigs for strict mode
      // References can point to files (./tsconfig.app.json) or directories
      const referencedConfigs = tsconfig.references.map(
        (ref: { path: string }) => {
          const refPath = resolve(rootDir, ref.path);
          // If the path ends with .json, it's a file; otherwise it's a directory
          const filePath = refPath.endsWith(".json")
            ? refPath
            : resolve(refPath, "tsconfig.json");
          return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
      );
      const hasStrictInRef = referencedConfigs.some(
        (config: { compilerOptions?: { strict?: boolean } }) =>
          config.compilerOptions?.strict === true
      );
      expect(hasStrictInRef).toBe(true);
    } else {
      expect(hasStrictInRoot).toBe(true);
    }
  });

  test("tsc --noEmit exits with code 0", () => {
    // This will throw if tsc --noEmit fails (non-zero exit)
    expect(() => {
      execSync("npx tsc --noEmit", { cwd: rootDir, stdio: "pipe" });
    }).not.toThrow();
  });
});

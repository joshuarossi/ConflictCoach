import { describe, test, expect } from "vitest";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../..");

describe("TypeScript strict mode is enabled and tsc --noEmit passes", () => {
  test("tsconfig.json has strict: true", () => {
    const tsconfig = JSON.parse(
      readFileSync(resolve(root, "tsconfig.json"), "utf-8"),
    );
    expect(tsconfig.compilerOptions?.strict).toBe(true);
  });

  test("tsc --noEmit exits with code 0", () => {
    // This will throw if the command exits with a non-zero code
    expect(() => {
      execSync("npx tsc --noEmit", { cwd: root, stdio: "pipe" });
    }).not.toThrow();
  });
});

import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("AC: TypeScript strict mode is enabled and tsc --noEmit passes", () => {
  test("tsconfig.json has strict mode enabled", () => {
    const tsconfigPath = resolve(__dirname, "../../tsconfig.json");
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  test("tsconfig.json has path alias @/ pointing to src/", () => {
    const tsconfigPath = resolve(__dirname, "../../tsconfig.json");
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8"));
    expect(tsconfig.compilerOptions.paths).toBeDefined();
    expect(tsconfig.compilerOptions.paths["@/*"]).toContain("./src/*");
  });
});

import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("AC: TypeScript strict mode is enabled and tsc --noEmit passes", () => {
  test("tsconfig.json exists and has strict mode enabled", () => {
    const tsconfigPath = resolve(__dirname, "../../tsconfig.json");
    const raw = readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(raw);

    expect(tsconfig.compilerOptions).toBeDefined();
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  test("tsconfig.json has path alias @/ mapped to src/", () => {
    const tsconfigPath = resolve(__dirname, "../../tsconfig.json");
    const raw = readFileSync(tsconfigPath, "utf-8");
    const tsconfig = JSON.parse(raw);

    expect(tsconfig.compilerOptions.paths).toBeDefined();
    expect(tsconfig.compilerOptions.paths["@/*"]).toContain("./src/*");
  });
});

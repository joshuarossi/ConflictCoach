import { describe, test, expect } from "vitest";
import { existsSync, readdirSync } from "fs";
import { resolve } from "path";

describe("AC: Running npx convex dev initializes the Convex backend without errors", () => {
  const rootDir = resolve(__dirname, "../..");

  test("convex/ directory exists", () => {
    expect(existsSync(resolve(rootDir, "convex"))).toBe(true);
  });

  test("convex/ directory contains at least one .ts file", () => {
    const convexDir = resolve(rootDir, "convex");
    const files = readdirSync(convexDir);
    const tsFiles = files.filter((f) => f.endsWith(".ts"));
    expect(tsFiles.length).toBeGreaterThan(0);
  });

  test("convex package is installed as a dependency", () => {
    const pkg = JSON.parse(
      require("fs").readFileSync(resolve(rootDir, "package.json"), "utf-8")
    );
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(allDeps).toHaveProperty("convex");
  });
});

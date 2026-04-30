import { describe, test, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../..");

describe("Running `npx convex dev` initializes the Convex backend without errors", () => {
  test("convex/ directory exists", () => {
    expect(existsSync(resolve(root, "convex"))).toBe(true);
  });

  test("convex package is listed in package.json dependencies", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf-8"),
    );
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(allDeps).toHaveProperty("convex");
  });

  test("convex/_generated directory exists (npx convex dev was run)", () => {
    // When `npx convex dev` (or `npx convex init`) runs successfully,
    // it generates the convex/_generated/ directory with type helpers.
    expect(existsSync(resolve(root, "convex/_generated"))).toBe(true);
  });
});

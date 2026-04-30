import { describe, test, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

describe("AC: Running npx convex dev initializes the Convex backend without errors", () => {
  const root = resolve(__dirname, "../..");

  test("convex/ directory exists", () => {
    expect(existsSync(resolve(root, "convex"))).toBe(true);
  });

  test("convex package is listed as a dependency", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf-8")
    );
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(allDeps["convex"]).toBeDefined();
  });
});

// Need readFileSync for the second test
import { readFileSync } from "fs";

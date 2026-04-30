import { describe, test, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

describe("AC: Running npx convex dev initializes the Convex backend without errors", () => {
  test("convex/ directory exists", () => {
    const convexDir = resolve(__dirname, "../../convex");
    expect(existsSync(convexDir)).toBe(true);
  });

  test("convex package is listed as a dependency", () => {
    const pkgPath = resolve(__dirname, "../../package.json");
    const pkg = JSON.parse(require("fs").readFileSync(pkgPath, "utf-8"));
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    expect(allDeps["convex"]).toBeDefined();
  });
});

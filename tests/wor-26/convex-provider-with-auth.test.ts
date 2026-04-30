import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * AC: ConvexProviderWithAuth wraps the React app in main.tsx
 *
 * Validates that src/main.tsx uses ConvexProviderWithAuth (from the
 * Convex React client) to wrap the application, providing auth context
 * to all downstream components and Convex hooks.
 */
describe("ConvexProviderWithAuth wraps the React app in main.tsx", () => {
  const mainTsxPath = path.resolve(__dirname, "../../src/main.tsx");

  it("src/main.tsx exists", () => {
    expect(fs.existsSync(mainTsxPath)).toBe(true);
  });

  it("main.tsx imports ConvexProviderWithAuth", () => {
    const content = fs.readFileSync(mainTsxPath, "utf-8");
    expect(content).toMatch(/import\s.*ConvexProviderWithAuth/);
  });

  it("main.tsx renders ConvexProviderWithAuth in the component tree", () => {
    const content = fs.readFileSync(mainTsxPath, "utf-8");
    expect(content).toMatch(/<ConvexProviderWithAuth/);
  });

  it("main.tsx creates a ConvexReactClient with the Convex URL", () => {
    const content = fs.readFileSync(mainTsxPath, "utf-8");
    // Should instantiate ConvexReactClient using the VITE_CONVEX_URL env var
    expect(content).toMatch(/ConvexReactClient/);
    expect(content).toMatch(/VITE_CONVEX_URL/);
  });
});

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const MAIN_TSX_PATH = path.resolve(__dirname, "../../src/main.tsx");

describe("AC: ConvexProviderWithAuth wraps the React app in main.tsx", () => {
  test("main.tsx imports ConvexProviderWithAuth", () => {
    const source = readFileSync(MAIN_TSX_PATH, "utf-8");
    expect(source).toContain("ConvexProviderWithAuth");
  });

  test("main.tsx renders ConvexProviderWithAuth in the component tree", () => {
    const source = readFileSync(MAIN_TSX_PATH, "utf-8");
    // The provider should wrap the app in the render call
    expect(source).toMatch(/<ConvexProviderWithAuth[\s>]/);
  });

  test("main.tsx creates a ConvexReactClient with the VITE_CONVEX_URL env var", () => {
    const source = readFileSync(MAIN_TSX_PATH, "utf-8");
    expect(source).toContain("ConvexReactClient");
    expect(source).toContain("VITE_CONVEX_URL");
  });
});

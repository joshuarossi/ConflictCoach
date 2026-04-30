import { describe, test, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const AUTH_CONFIG_PATH = path.resolve(
  __dirname,
  "../../convex/auth.config.ts",
);

describe("AC: Convex Auth is initialized with magic-link and Google OAuth providers", () => {
  test("convex/auth.config.ts exists", () => {
    expect(existsSync(AUTH_CONFIG_PATH)).toBe(true);
  });

  test("auth config exports a default configuration (contains export default)", () => {
    const source = readFileSync(AUTH_CONFIG_PATH, "utf-8");
    expect(source).toMatch(/export\s+default/);
  });

  test("auth config includes a MagicLink (passwordless email) provider", () => {
    const source = readFileSync(AUTH_CONFIG_PATH, "utf-8");
    // The config should reference MagicLink or Resend (magic link provider)
    const hasMagicLink =
      source.includes("MagicLink") || source.includes("Resend");
    expect(hasMagicLink).toBe(true);
  });

  test("auth config includes a Google OAuth provider", () => {
    const source = readFileSync(AUTH_CONFIG_PATH, "utf-8");
    expect(source).toContain("Google");
  });
});

import { describe, test, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const AUTH_PATH = path.resolve(__dirname, "../../convex/auth.ts");

describe("AC: Convex Auth is initialized with magic-link and Google OAuth providers", () => {
  test("convex/auth.ts exists", () => {
    expect(existsSync(AUTH_PATH)).toBe(true);
  });

  test("auth module calls convexAuth to initialize the auth handlers", () => {
    const source = readFileSync(AUTH_PATH, "utf-8");
    expect(source).toContain("convexAuth");
  });

  test("auth module includes a MagicLink (passwordless email) provider", () => {
    const source = readFileSync(AUTH_PATH, "utf-8");
    // Email provider drives magic links; Resend is the configured email sender.
    const hasMagicLink =
      source.includes("Email") ||
      source.includes("MagicLink") ||
      source.includes("Resend");
    expect(hasMagicLink).toBe(true);
  });

  test("auth module includes a Google OAuth provider", () => {
    const source = readFileSync(AUTH_PATH, "utf-8");
    expect(source).toContain("Google");
  });
});

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * AC: Convex Auth is initialized with magic-link and Google OAuth providers
 *
 * Validates that convex/auth.config.ts exists and configures both
 * MagicLink and Google OAuth providers via convexAuth().
 */
describe("Convex Auth is initialized with magic-link and Google OAuth providers", () => {
  const authConfigPath = path.resolve(__dirname, "../../convex/auth.config.ts");

  it("convex/auth.config.ts exists", () => {
    expect(
      fs.existsSync(authConfigPath),
      "convex/auth.config.ts must exist",
    ).toBe(true);
  });

  it("auth config configures MagicLink provider", () => {
    const content = fs.readFileSync(authConfigPath, "utf-8");
    expect(content).toMatch(/MagicLink/);
  });

  it("auth config configures Google OAuth provider", () => {
    const content = fs.readFileSync(authConfigPath, "utf-8");
    expect(content).toMatch(/Google/);
  });

  it("auth config uses convexAuth to initialize providers", () => {
    const content = fs.readFileSync(authConfigPath, "utf-8");
    expect(content).toMatch(/convexAuth/);
  });

  it("auth config exports auth, signIn, signOut, and store", () => {
    const content = fs.readFileSync(authConfigPath, "utf-8");
    expect(content).toMatch(/export/);
    // Should destructure auth, signIn, signOut, store from convexAuth()
    expect(content).toMatch(/auth/);
    expect(content).toMatch(/signIn/);
    expect(content).toMatch(/signOut/);
    expect(content).toMatch(/store/);
  });
});

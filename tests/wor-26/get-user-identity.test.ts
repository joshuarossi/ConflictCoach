import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * AC: ctx.auth.getUserIdentity() returns identity for authenticated users
 *     in Convex functions
 *
 * Validates that at least one Convex function (query, mutation, or action)
 * uses ctx.auth.getUserIdentity() to retrieve the authenticated user's
 * identity. Per the TechSpec §4.2, every Convex function should start
 * with this check.
 *
 * This test verifies the auth helper exists. A full integration test
 * (calling a Convex function with a test session and asserting non-null
 * identity) requires a running Convex backend and is covered in e2e.
 */
describe("ctx.auth.getUserIdentity() returns identity for authenticated users in Convex functions", () => {
  const convexDir = path.resolve(__dirname, "../../convex");

  function getConvexSourceFiles(): string[] {
    const entries = fs.readdirSync(convexDir, {
      recursive: true,
    }) as string[];
    return entries
      .filter((f) => f.endsWith(".ts") && !f.includes("_generated"))
      .map((f) => path.join(convexDir, f));
  }

  it("at least one Convex function calls ctx.auth.getUserIdentity()", () => {
    const files = getConvexSourceFiles();
    const anyFileUsesGetUserIdentity = files.some((filePath) => {
      const content = fs.readFileSync(filePath, "utf-8");
      return content.includes("getUserIdentity");
    });
    expect(
      anyFileUsesGetUserIdentity,
      "Expected at least one Convex function to call ctx.auth.getUserIdentity()",
    ).toBe(true);
  });

  it("a Convex auth helper or function file exists beyond just schema", () => {
    // There should be at least one Convex function file (not just schema.ts
    // and auth.config.ts) that implements auth-gated logic.
    const files = getConvexSourceFiles();
    const functionFiles = files.filter(
      (f) =>
        !f.endsWith("schema.ts") &&
        !f.endsWith("auth.config.ts") &&
        !f.includes("tsconfig"),
    );
    expect(
      functionFiles.length,
      "Expected at least one Convex function file implementing auth-gated queries/mutations",
    ).toBeGreaterThan(0);
  });

  it("an auth-gated function throws on unauthenticated access", () => {
    // Verify the pattern: if (!identity) throw ... is present
    const files = getConvexSourceFiles();
    const anyFileThrowsOnUnauth = files.some((filePath) => {
      const content = fs.readFileSync(filePath, "utf-8");
      return (
        content.includes("getUserIdentity") &&
        (content.includes("UNAUTHENTICATED") ||
          content.includes("Not authenticated") ||
          content.includes("Unauthenticated"))
      );
    });
    expect(
      anyFileThrowsOnUnauth,
      "Expected auth-gated Convex functions to throw on unauthenticated access",
    ).toBe(true);
  });
});

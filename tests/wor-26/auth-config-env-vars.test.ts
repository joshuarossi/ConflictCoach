import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * AC: Auth config references correct env vars
 *     (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, MAGIC_LINK_EMAIL_FROM)
 *
 * The auth config or its provider setup must reference these environment
 * variables so that credentials are loaded from the environment at runtime.
 */
describe("Auth config references correct env vars", () => {
  // Auth-related files that should reference env vars.
  // The primary file is convex/auth.config.ts, but env var references
  // may also appear in provider configuration files imported by it.
  const authConfigPath = path.resolve(__dirname, "../../convex/auth.config.ts");
  const convexDir = path.resolve(__dirname, "../../convex");

  function readAllConvexFiles(): string {
    const files = fs.readdirSync(convexDir, { recursive: true }) as string[];
    return files
      .filter((f) => f.endsWith(".ts") && !f.includes("_generated"))
      .map((f) => fs.readFileSync(path.join(convexDir, f), "utf-8"))
      .join("\n");
  }

  it("convex/auth.config.ts exists", () => {
    expect(fs.existsSync(authConfigPath)).toBe(true);
  });

  it("references GOOGLE_OAUTH_CLIENT_ID", () => {
    const content = readAllConvexFiles();
    expect(content).toContain("GOOGLE_OAUTH_CLIENT_ID");
  });

  it("references GOOGLE_OAUTH_CLIENT_SECRET", () => {
    const content = readAllConvexFiles();
    expect(content).toContain("GOOGLE_OAUTH_CLIENT_SECRET");
  });

  it("references MAGIC_LINK_EMAIL_FROM", () => {
    const content = readAllConvexFiles();
    expect(content).toContain("MAGIC_LINK_EMAIL_FROM");
  });
});

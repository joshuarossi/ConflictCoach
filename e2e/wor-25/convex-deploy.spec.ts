import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "../..");
const SCHEMA_PATH = path.join(PROJECT_ROOT, "convex", "schema.ts");

test.describe("AC4: npx convex dev deploys the schema successfully", () => {
  test("convex/schema.ts exists (prerequisite for deployment)", () => {
    expect(
      existsSync(SCHEMA_PATH),
      "convex/schema.ts must exist before it can be deployed",
    ).toBe(true);
  });

  test("convex/schema.ts passes Convex typecheck", () => {
    // Typecheck the convex directory to catch schema definition errors
    // that would prevent deployment
    execSync("npx tsc --noEmit -p convex/tsconfig.json", {
      cwd: PROJECT_ROOT,
      stdio: "pipe",
      timeout: 30000,
    });
  });

  test("npx convex dev deploys the schema successfully", () => {
    // This test pushes the schema to a Convex dev deployment.
    // It requires a configured Convex project (CONVEX_DEPLOYMENT env var
    // or a logged-in `npx convex` session).
    //
    // NOTE: This test will be skipped in environments without Convex
    // credentials. CI should set CONVEX_DEPLOY_KEY or equivalent.
    const hasConvexConfig =
      existsSync(path.join(PROJECT_ROOT, ".env.local")) ||
      !!process.env.CONVEX_DEPLOY_KEY ||
      !!process.env.CONVEX_DEPLOYMENT;

    test.skip(
      !hasConvexConfig,
      "Skipped: no Convex deployment configured (set CONVEX_DEPLOY_KEY or .env.local)",
    );

    try {
      execSync("npx convex dev --once --typecheck=disable", {
        cwd: PROJECT_ROOT,
        stdio: "pipe",
        timeout: 60000,
        env: { ...process.env },
      });
    } catch (error: unknown) {
      const err = error as { status?: number; stderr?: Buffer };
      const stderr = err.stderr?.toString() ?? "";
      expect(
        err.status,
        `convex dev --once failed with stderr:\n${stderr}`,
      ).toBe(0);
    }
  });
});

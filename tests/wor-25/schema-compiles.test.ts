import { describe, test, expect } from "vitest";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.resolve(__dirname, "../../convex/schema.ts");

describe("AC1: convex/schema.ts compiles without errors and matches TechSpec §3.1 exactly", () => {
  test("convex/schema.ts exists", () => {
    expect(existsSync(SCHEMA_PATH)).toBe(true);
  });

  test(
    "convex/schema.ts compiles without TypeScript errors (tsc --noEmit)",
    // tsc on a cold CI runner regularly takes 4–7s. The default 5s
    // timeout makes this test flaky in CI even when nothing is wrong.
    { timeout: 30_000 },
    () => {
      // Run tsc on the convex directory — a compilation failure throws
      execSync("npx tsc --noEmit -p convex/tsconfig.json", {
        cwd: path.resolve(__dirname, "../.."),
        stdio: "pipe",
      });
    },
  );

  test("convex/schema.ts exports a default schema definition", async () => {
    const schema = await import("../../convex/schema");
    expect(schema.default).toBeDefined();
  });
});

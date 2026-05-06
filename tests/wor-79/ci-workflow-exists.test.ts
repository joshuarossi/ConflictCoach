/**
 * WOR-79 AC1: GitHub Actions workflow file exists at .github/workflows/ci.yml
 */
import { describe, test, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

describe("AC1: CI workflow file exists", () => {
  const workflowPath = resolve(__dirname, "../../.github/workflows/ci.yml");

  test("ci.yml exists at .github/workflows/ci.yml", () => {
    expect(existsSync(workflowPath)).toBe(true);
  });
});

/**
 * WOR-79 AC2: lint job runs ESLint + Prettier check
 */
import { describe, test, expect } from "vitest";
import { loadCiWorkflow, getJobs, flattenRunSteps } from "./helpers";

describe("AC2: lint job runs ESLint + Prettier check", () => {
  const workflow = loadCiWorkflow();
  const jobs = getJobs(workflow);

  test("a dedicated 'lint' job exists", () => {
    expect(jobs).toHaveProperty("lint");
  });

  test("lint job runs eslint", () => {
    expect(jobs.lint).toBeDefined();
    const runs = flattenRunSteps(jobs.lint);
    expect(runs).toMatch(/eslint|npm run lint/i);
  });

  test("lint job runs prettier check", () => {
    expect(jobs.lint).toBeDefined();
    const runs = flattenRunSteps(jobs.lint);
    expect(runs).toMatch(/prettier.*--check|npx prettier/i);
  });
});

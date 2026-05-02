/**
 * WOR-79 AC3: typecheck job runs tsc --noEmit
 */
import { describe, test, expect } from "vitest";
import { loadCiWorkflow, getJobs, flattenRunSteps } from "./helpers";

describe("AC3: typecheck job runs tsc --noEmit", () => {
  const workflow = loadCiWorkflow();
  const jobs = getJobs(workflow);

  test("a dedicated 'typecheck' job exists", () => {
    expect(jobs).toHaveProperty("typecheck");
  });

  test("typecheck job runs tsc --noEmit or npm run typecheck", () => {
    expect(jobs.typecheck).toBeDefined();
    const runs = flattenRunSteps(jobs.typecheck);
    expect(runs).toMatch(/tsc\s+--noEmit|npm run typecheck/);
  });
});

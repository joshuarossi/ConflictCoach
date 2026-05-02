/**
 * WOR-79 AC4: unit job runs Vitest
 */
import { describe, test, expect } from "vitest";
import { loadCiWorkflow, getJobs, flattenRunSteps } from "./helpers";

describe("AC4: unit job runs Vitest", () => {
  const workflow = loadCiWorkflow();
  const jobs = getJobs(workflow);

  test("a dedicated 'unit' job exists", () => {
    expect(jobs).toHaveProperty("unit");
  });

  test("unit job runs vitest or npm test", () => {
    expect(jobs.unit).toBeDefined();
    const runs = flattenRunSteps(jobs.unit);
    expect(runs).toMatch(/vitest|npm run test:unit|npm test/);
  });
});

/**
 * WOR-79 AC7: lint, typecheck, and unit jobs run in parallel; e2e runs
 * after all three pass
 */
import { describe, test, expect } from "vitest";
import { loadCiWorkflow, getJobs } from "./helpers";

describe("AC7: job ordering — parallel gates, e2e after all pass", () => {
  const workflow = loadCiWorkflow();
  const jobs = getJobs(workflow);

  test("lint job has no 'needs' (runs in parallel)", () => {
    expect(jobs.lint).toBeDefined();
    expect(jobs.lint.needs).toBeUndefined();
  });

  test("typecheck job has no 'needs' (runs in parallel)", () => {
    expect(jobs.typecheck).toBeDefined();
    expect(jobs.typecheck.needs).toBeUndefined();
  });

  test("unit job has no 'needs' (runs in parallel)", () => {
    expect(jobs.unit).toBeDefined();
    expect(jobs.unit.needs).toBeUndefined();
  });

  test("e2e job depends on lint, typecheck, and unit", () => {
    expect(jobs.e2e).toBeDefined();
    const needs = jobs.e2e.needs as string[] | string;
    const needsList = Array.isArray(needs) ? needs : [needs];
    expect(needsList).toContain("lint");
    expect(needsList).toContain("typecheck");
    expect(needsList).toContain("unit");
  });
});

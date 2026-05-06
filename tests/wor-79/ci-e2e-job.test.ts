/**
 * WOR-79 AC5: e2e job starts a Convex dev deployment and runs Playwright
 * with CLAUDE_MOCK=true
 */
import { describe, test, expect } from "vitest";
import { loadCiWorkflow, getJobs, flattenRunSteps, getSteps } from "./helpers";

describe("AC5: e2e job runs Playwright with CLAUDE_MOCK=true", () => {
  const workflow = loadCiWorkflow();
  const jobs = getJobs(workflow);

  test("a dedicated 'e2e' job exists", () => {
    expect(jobs).toHaveProperty("e2e");
  });

  test("e2e job references Convex deployment (convex dev or convex deploy)", () => {
    expect(jobs.e2e).toBeDefined();
    const runs = flattenRunSteps(jobs.e2e);
    expect(runs).toMatch(/convex\s+(dev|deploy)/);
  });

  test("e2e job runs Playwright (playwright test or npm run test:e2e)", () => {
    expect(jobs.e2e).toBeDefined();
    const runs = flattenRunSteps(jobs.e2e);
    expect(runs).toMatch(/playwright|npm run test:e2e/);
  });

  test("e2e job sets CLAUDE_MOCK=true", () => {
    expect(jobs.e2e).toBeDefined();
    const e2eJob = jobs.e2e;

    // CLAUDE_MOCK may be set as a job-level env, step-level env, or inline
    const jobEnv = (e2eJob?.env as Record<string, unknown>) ?? {};
    const steps = getSteps(e2eJob);
    const stepEnvs = steps.flatMap((s) =>
      Object.entries((s.env ?? {}) as Record<string, unknown>),
    );
    const allRuns = flattenRunSteps(e2eJob);

    const hasJobEnv =
      jobEnv.CLAUDE_MOCK === true || jobEnv.CLAUDE_MOCK === "true";
    const hasStepEnv = stepEnvs.some(
      ([k, v]) => k === "CLAUDE_MOCK" && (v === true || v === "true"),
    );
    const hasInlineEnv = allRuns.includes("CLAUDE_MOCK=true");

    expect(hasJobEnv || hasStepEnv || hasInlineEnv).toBe(true);
  });
});

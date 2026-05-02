/**
 * WOR-79 AC8: Playwright test results and screenshots are uploaded as
 * artifacts on failure
 */
import { describe, test, expect } from "vitest";
import { loadCiWorkflow, getJobs, getUsesActions, getSteps } from "./helpers";

describe("AC8: Playwright artifacts uploaded on failure", () => {
  const workflow = loadCiWorkflow();
  const jobs = getJobs(workflow);

  test("e2e job uses actions/upload-artifact", () => {
    expect(jobs.e2e).toBeDefined();
    const uses = getUsesActions(jobs.e2e);
    const hasUpload = uses.some((u) => u.includes("actions/upload-artifact"));
    expect(hasUpload).toBe(true);
  });

  test("upload-artifact step runs on failure (if: failure())", () => {
    expect(jobs.e2e).toBeDefined();
    const steps = getSteps(jobs.e2e);

    const uploadSteps = steps.filter(
      (s) =>
        typeof s.uses === "string" &&
        s.uses.includes("actions/upload-artifact"),
    );

    expect(uploadSteps.length).toBeGreaterThan(0);

    // At least one upload step must be conditioned on failure
    const hasFailureCondition = uploadSteps.some((s) => {
      const condition = String(s.if ?? "");
      return (
        condition.includes("failure()") ||
        condition.includes("always()") ||
        condition.includes("!cancelled()")
      );
    });

    expect(hasFailureCondition).toBe(true);
  });

  test("upload-artifact step references playwright report or screenshots", () => {
    expect(jobs.e2e).toBeDefined();
    const steps = getSteps(jobs.e2e);

    const uploadSteps = steps.filter(
      (s) =>
        typeof s.uses === "string" &&
        s.uses.includes("actions/upload-artifact"),
    );

    // Check that the artifact path references playwright output
    const stepTexts = uploadSteps.map((s) => JSON.stringify(s).toLowerCase());
    const referencesPlaywright = stepTexts.some(
      (t) =>
        t.includes("playwright") ||
        t.includes("test-results") ||
        t.includes("screenshot"),
    );

    expect(referencesPlaywright).toBe(true);
  });
});

/**
 * WOR-79 AC6: Workflow triggers on push to main and on pull requests
 * targeting main
 */
import { describe, test, expect } from "vitest";
import { loadCiWorkflow } from "./helpers";

describe("AC6: workflow triggers on push to main and PRs targeting main", () => {
  const workflow = loadCiWorkflow();
  const triggers = workflow.on as Record<string, unknown> | undefined;
  // GitHub Actions also allows `true` as a shorthand (trigger on all branches)
  const isTrue = (v: unknown): boolean => v === true || v === null;

  test("workflow triggers on push to main", () => {
    expect(triggers).toBeDefined();
    expect(triggers).toHaveProperty("push");

    const push = triggers!.push as Record<string, unknown> | boolean | null;
    if (isTrue(push)) {
      // Triggers on all pushes — acceptable (includes main)
      expect(true).toBe(true);
    } else {
      const branches = (push as Record<string, unknown>).branches as string[];
      expect(branches).toContain("main");
    }
  });

  test("workflow triggers on pull requests targeting main", () => {
    expect(triggers).toBeDefined();
    expect(triggers).toHaveProperty("pull_request");

    const pr = triggers!.pull_request as Record<string, unknown> | boolean | null;
    if (isTrue(pr)) {
      // Triggers on all PRs — acceptable (includes those targeting main)
      expect(true).toBe(true);
    } else {
      const branches = (pr as Record<string, unknown>).branches as string[];
      expect(branches).toContain("main");
    }
  });
});

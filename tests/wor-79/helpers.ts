import { readFileSync } from "fs";
import { resolve } from "path";
import { parse } from "yaml";

const CI_WORKFLOW_PATH = resolve(
  __dirname,
  "../../.github/workflows/ci.yml",
);

export function loadCiWorkflow(): Record<string, unknown> {
  const raw = readFileSync(CI_WORKFLOW_PATH, "utf-8");
  return parse(raw) as Record<string, unknown>;
}

export function getJobs(
  workflow: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  return (workflow.jobs ?? {}) as Record<string, Record<string, unknown>>;
}

/**
 * Flatten all `run:` values from a job's steps into a single string
 * for easy substring matching. Returns empty string if job is undefined.
 */
export function flattenRunSteps(
  job: Record<string, unknown> | undefined,
): string {
  if (!job) return "";
  const steps = (job.steps ?? []) as Array<Record<string, unknown>>;
  return steps
    .map((s) => (typeof s.run === "string" ? s.run : ""))
    .join("\n");
}

/**
 * Return all `uses:` values from a job's steps.
 * Returns empty array if job is undefined.
 */
export function getUsesActions(
  job: Record<string, unknown> | undefined,
): string[] {
  if (!job) return [];
  const steps = (job.steps ?? []) as Array<Record<string, unknown>>;
  return steps
    .filter((s) => typeof s.uses === "string")
    .map((s) => s.uses as string);
}

/**
 * Get steps from a job. Returns empty array if job is undefined.
 */
export function getSteps(
  job: Record<string, unknown> | undefined,
): Array<Record<string, unknown>> {
  if (!job) return [];
  return (job.steps ?? []) as Array<Record<string, unknown>>;
}

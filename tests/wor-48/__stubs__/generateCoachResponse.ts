/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * WOR-48 test stub: placeholder for convex/jointChat/generateCoachResponse.ts
 *
 * This file exists solely to satisfy Vite's import analysis during test runs.
 * When the real implementation is created, delete this stub and remove the
 * vitest.config alias that points here.
 *
 * Every export is undefined/empty — tests that import these will fail at
 * assertion time (the desired red state).
 */

/** Classification labels for the Haiku gate. */
export type Classification =
  | "INFLAMMATORY"
  | "PROGRESS"
  | "QUESTION_TO_COACH"
  | "NORMAL_EXCHANGE";

/** Stub: classifies a message via Haiku. Returns undefined (red state). */
export async function classifyMessage(
  _client: unknown,
  _message: string,
): Promise<Classification | undefined> {
  return undefined;
}

/** Stub: classifications that trigger a coach response. */
export const CLASSIFICATIONS_REQUIRING_RESPONSE: Classification[] | undefined =
  undefined;

/** Stub: determines if a classification is an intervention. */
export function getIsIntervention(
  _classification: string,
): boolean | undefined {
  return undefined;
}

/** Stub: builds the opening message prompt. */
export function buildOpeningMessagePrompt(
  _opts: { mainTopic: string; category: string },
): string | undefined {
  return undefined;
}

/** Stub: the Convex action. Returns without doing anything (red state). */
export async function generateCoachResponse(
  _ctx: unknown,
  _args: unknown,
): Promise<void> {
  // No-op: does not call Anthropic, does not insert messages, does not stream.
  // Tests that assert on side-effects (mutations, API calls) will fail.
}

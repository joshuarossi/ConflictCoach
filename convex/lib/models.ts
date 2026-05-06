/**
 * Single source of truth for Anthropic model IDs used across Convex actions.
 *
 * Anthropic deprecates dated model snapshots (e.g. `claude-sonnet-4-5-20250514`)
 * over time and returns 404 from the messages API for retired IDs. Pinning
 * via aliases (no date suffix) means the API resolves to the current
 * stable snapshot — so we don't have to ship a code change every time
 * Anthropic rotates their dated snapshots.
 *
 * If a specific dated snapshot is ever required (for reproducibility or
 * to avoid behavioral drift), pin here and document the reason.
 */

/** Primary generation model — used for all streaming AI replies. */
export const SONNET_MODEL = "claude-sonnet-4-6";

/** Lightweight classification/compression model. */
export const HAIKU_MODEL = "claude-haiku-4-5";

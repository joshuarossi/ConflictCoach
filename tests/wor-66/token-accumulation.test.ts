/**
 * Tests for WOR-66 AC1: Token counts from each AI call are recorded
 * and accumulated per case
 *
 * Verifies that the accumulator correctly sums token usage from multiple
 * AI calls and persists per-case totals.
 */
import { describe, test, expect } from "vitest";

// @ts-expect-error WOR-66 red-state import: implementation is created by task-implement.
import { accumulateUsage, SONNET_INPUT_RATE, SONNET_OUTPUT_RATE, HAIKU_INPUT_RATE, HAIKU_OUTPUT_RATE, type AiUsageEntry } from "../../convex/lib/costBudget";

describe("WOR-66: Token counts recorded and accumulated per case", () => {
  test("accumulates token counts from a single AI call", () => {
    const entries: AiUsageEntry[] = [
      { model: "sonnet", inputTokens: 500, outputTokens: 200 },
    ];

    const result = accumulateUsage(entries);
    expect(result.totalInputTokens).toBe(500);
    expect(result.totalOutputTokens).toBe(200);
  });

  test("accumulates token counts across multiple AI calls", () => {
    const entries: AiUsageEntry[] = [
      { model: "sonnet", inputTokens: 500, outputTokens: 200 },
      { model: "sonnet", inputTokens: 1000, outputTokens: 400 },
      { model: "haiku", inputTokens: 300, outputTokens: 100 },
    ];

    const result = accumulateUsage(entries);
    expect(result.totalInputTokens).toBe(1800);
    expect(result.totalOutputTokens).toBe(700);
  });

  test("computes total estimated cost across mixed model calls", () => {
    const entries: AiUsageEntry[] = [
      { model: "sonnet", inputTokens: 1000, outputTokens: 500 },
      { model: "haiku", inputTokens: 2000, outputTokens: 1000 },
    ];

    const result = accumulateUsage(entries);
    const expectedCost =
      1000 * SONNET_INPUT_RATE +
      500 * SONNET_OUTPUT_RATE +
      2000 * HAIKU_INPUT_RATE +
      1000 * HAIKU_OUTPUT_RATE;
    expect(result.totalCost).toBeCloseTo(expectedCost, 10);
  });

  test("returns zero totals for empty entries", () => {
    const result = accumulateUsage([]);
    expect(result.totalInputTokens).toBe(0);
    expect(result.totalOutputTokens).toBe(0);
    expect(result.totalCost).toBe(0);
  });
});

/**
 * Tests for WOR-66 AC2: Cost estimation using token count × model pricing
 * (Sonnet vs. Haiku rates)
 *
 * Verifies that the cost calculation module correctly computes dollar cost
 * from input/output token counts at model-specific rates.
 */
import { describe, test, expect } from "vitest";

import { calculateCost, SONNET_INPUT_RATE, SONNET_OUTPUT_RATE, HAIKU_INPUT_RATE, HAIKU_OUTPUT_RATE } from "../../convex/lib/costBudget";

describe("WOR-66: Cost estimation using token count × model pricing", () => {
  test("exports Sonnet input/output rates as positive numbers", () => {
    expect(SONNET_INPUT_RATE).toBeGreaterThan(0);
    expect(SONNET_OUTPUT_RATE).toBeGreaterThan(0);
  });

  test("exports Haiku input/output rates as positive numbers", () => {
    expect(HAIKU_INPUT_RATE).toBeGreaterThan(0);
    expect(HAIKU_OUTPUT_RATE).toBeGreaterThan(0);
  });

  test("Haiku rates are cheaper than Sonnet rates", () => {
    expect(HAIKU_INPUT_RATE).toBeLessThan(SONNET_INPUT_RATE);
    expect(HAIKU_OUTPUT_RATE).toBeLessThan(SONNET_OUTPUT_RATE);
  });

  test("calculates cost for Sonnet with known input/output tokens", () => {
    const cost = calculateCost({
      model: "sonnet",
      inputTokens: 1000,
      outputTokens: 500,
    });

    const expected = 1000 * SONNET_INPUT_RATE + 500 * SONNET_OUTPUT_RATE;
    expect(cost).toBeCloseTo(expected, 10);
  });

  test("calculates cost for Haiku with known input/output tokens", () => {
    const cost = calculateCost({
      model: "haiku",
      inputTokens: 1000,
      outputTokens: 500,
    });

    const expected = 1000 * HAIKU_INPUT_RATE + 500 * HAIKU_OUTPUT_RATE;
    expect(cost).toBeCloseTo(expected, 10);
  });

  test("returns zero cost when both token counts are zero", () => {
    const cost = calculateCost({
      model: "sonnet",
      inputTokens: 0,
      outputTokens: 0,
    });

    expect(cost).toBe(0);
  });

  test("returns zero cost for Haiku with zero tokens", () => {
    const cost = calculateCost({
      model: "haiku",
      inputTokens: 0,
      outputTokens: 0,
    });

    expect(cost).toBe(0);
  });

  test("handles large token counts without overflow", () => {
    // Simulate a very long coaching session
    const cost = calculateCost({
      model: "sonnet",
      inputTokens: 100_000,
      outputTokens: 50_000,
    });

    expect(cost).toBeGreaterThan(0);
    expect(Number.isFinite(cost)).toBe(true);
  });
});

/**
 * Tests for WOR-66 AC4: Hard cap behavior
 *
 * At $10 hard cap: AI features fully disabled; parties exchange messages
 * manually without Coach, Draft Coach, or synthesis.
 */
import { describe, test, expect } from "vitest";

// @ts-expect-error WOR-66 red-state import: implementation is created by task-implement.
import { checkCostBudget } from "../../convex/lib/costBudget";

describe("WOR-66: $10 hard cap enforcement", () => {
  test("hard cap blocks generation actions", () => {
    const result = checkCostBudget(10.5, { actionType: "generation" });
    expect(result.status).toBe("hard_cap");
  });

  test("hard cap blocks classification actions", () => {
    const result = checkCostBudget(10.5, { actionType: "classification" });
    expect(result.status).toBe("hard_cap");
  });

  test("hard cap blocks synthesis actions", () => {
    const result = checkCostBudget(10.5, { actionType: "synthesis" });
    expect(result.status).toBe("hard_cap");
  });

  test("hard cap blocks draft_coach actions", () => {
    const result = checkCostBudget(10.5, { actionType: "draft_coach" });
    expect(result.status).toBe("hard_cap");
  });

  test("hard cap blocks coach actions", () => {
    const result = checkCostBudget(10.5, { actionType: "coach" });
    expect(result.status).toBe("hard_cap");
  });

  test("hard cap blocks compression actions", () => {
    const result = checkCostBudget(10.5, { actionType: "compression" });
    expect(result.status).toBe("hard_cap");
  });

  test("cost just below hard cap returns soft_cap not hard_cap", () => {
    const result = checkCostBudget(9.99);
    expect(result.status).toBe("soft_cap");
  });

  test("cost exactly at hard cap threshold returns hard_cap", () => {
    const result = checkCostBudget(10.0);
    expect(result.status).toBe("hard_cap");
  });
});

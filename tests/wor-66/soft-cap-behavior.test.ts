/**
 * Tests for WOR-66 AC3: Soft cap behavior
 *
 * At $2 soft cap: inflammatory classification continues (cheap);
 * Coach responds with templated boilerplate; admin notified via audit log.
 */
import { describe, test, expect, vi } from "vitest";

// @ts-expect-error WOR-66 red-state import: implementation is created by task-implement.
import { SOFT_CAP_BOILERPLATE, checkCostBudget } from "../../convex/lib/costBudget";
// @ts-expect-error WOR-66 red-state import: implementation is created by task-implement.
import { enforceCostBudget } from "../../convex/lib/costBudget";

describe("WOR-66: $2 soft cap enforcement", () => {
  test("templated boilerplate mentions being limited and summarizing", () => {
    // AC3 specifies: "I'm limited right now — consider summarizing where you are
    // and whether you've reached agreement"
    expect(SOFT_CAP_BOILERPLATE).toMatch(/limited/i);
    expect(SOFT_CAP_BOILERPLATE).toMatch(/summariz/i);
  });

  test("soft cap status indicates coach should use boilerplate", () => {
    const result = checkCostBudget(2.5);
    expect(result.status).toBe("soft_cap");
    // The caller should use SOFT_CAP_BOILERPLATE instead of calling Claude
  });

  test("at soft cap, classification action type is allowed through", () => {
    // Inflammatory classification uses Haiku (cheap) and should continue
    const result = checkCostBudget(4.0, { actionType: "classification" });
    expect(result.status).toBe("ok");
  });

  test("at soft cap, generation action type is blocked", () => {
    const result = checkCostBudget(4.0, { actionType: "generation" });
    expect(result.status).toBe("soft_cap");
  });

  test("at soft cap, synthesis action type is blocked", () => {
    const result = checkCostBudget(4.0, { actionType: "synthesis" });
    expect(result.status).toBe("soft_cap");
  });

  test("at soft cap, draft_coach action type is blocked", () => {
    const result = checkCostBudget(4.0, { actionType: "draft_coach" });
    expect(result.status).toBe("soft_cap");
  });

  test("at soft cap, coach action type is blocked", () => {
    const result = checkCostBudget(4.0, { actionType: "coach" });
    expect(result.status).toBe("soft_cap");
  });

  test("at soft cap, compression action type is blocked", () => {
    const result = checkCostBudget(4.0, { actionType: "compression" });
    expect(result.status).toBe("soft_cap");
  });

  test("writes audit log with COST_SOFT_CAP_REACHED when soft cap first reached", async () => {
    // enforceCostBudget is the higher-level guard that wraps checkCostBudget
    // and writes audit log entries when cap transitions occur.
    const mockCtx = {
      runMutation: vi.fn(),
    };
    const caseId = "test-case-id" as any;

    // Cost at $2.50 triggers soft cap
    await enforceCostBudget(mockCtx as any, {
      caseId,
      currentCost: 2.5,
      actionType: "generation",
    });

    // Verify an audit log mutation was scheduled with the correct action
    expect(mockCtx.runMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "COST_SOFT_CAP_REACHED",
        caseId,
      }),
    );
  });
});

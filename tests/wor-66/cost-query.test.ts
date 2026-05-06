/**
 * Tests for WOR-66 AC6: Current cost is queryable per case (for admin visibility)
 *
 * Verifies that the cost query module exposes a function to retrieve
 * per-case cost data.
 */
import { describe, test, expect, vi } from "vitest";

// @ts-expect-error WOR-66 red-state import: implementation is created by task-implement.
import {
  calculateCost,
  accumulateUsage,
  type AiUsageEntry,
} from "../../convex/lib/costBudget";
import { getCaseCost } from "../../convex/cases";

describe("WOR-66: Per-case cost queryable", () => {
  test("accumulated usage provides queryable totalCost field", () => {
    const entries: AiUsageEntry[] = [
      { model: "sonnet", inputTokens: 5000, outputTokens: 2000 },
      { model: "haiku", inputTokens: 10000, outputTokens: 5000 },
    ];

    const result = accumulateUsage(entries);
    expect(result).toHaveProperty("totalCost");
    expect(typeof result.totalCost).toBe("number");
    expect(result.totalCost).toBeGreaterThan(0);
  });

  test("accumulated usage provides token breakdown for admin visibility", () => {
    const entries: AiUsageEntry[] = [
      { model: "sonnet", inputTokens: 5000, outputTokens: 2000 },
    ];

    const result = accumulateUsage(entries);
    expect(result).toHaveProperty("totalInputTokens");
    expect(result).toHaveProperty("totalOutputTokens");
    expect(result).toHaveProperty("totalCost");
  });

  test("cost calculation is consistent with accumulation", () => {
    const entries: AiUsageEntry[] = [
      { model: "sonnet", inputTokens: 1000, outputTokens: 500 },
    ];

    const accumulated = accumulateUsage(entries);
    const directCost = calculateCost({
      model: "sonnet",
      inputTokens: 1000,
      outputTokens: 500,
    });

    expect(accumulated.totalCost).toBeCloseTo(directCost, 10);
  });

  describe("Convex query endpoint for per-case cost", () => {
    test("getCaseCost returns totalCost, totalInputTokens, totalOutputTokens", async () => {
      const mockCase = {
        _id: "case-123" as any,
        aiUsage: {
          totalInputTokens: 5000,
          totalOutputTokens: 2000,
          totalCostUsd: 0.05,
        },
      };
      const mockAdminUser = {
        _id: "admin-user",
        role: "ADMIN",
        email: "admin@test",
      };
      // db.get is called twice: once with caseId (return case doc), once with
      // userId from `subject` (return admin user record). Convex Auth's
      // identity.subject is "<userId>|<sessionId>", so requireAuth/getCaseCost
      // splits and looks up the row by userId.
      const mockCtx = {
        auth: {
          getUserIdentity: vi.fn().mockResolvedValue({
            subject: "admin-user|session-1",
          }),
        },
        db: {
          get: vi.fn().mockImplementation(async (id: string) => {
            if (id === "case-123") return mockCase;
            if (id === "admin-user") return mockAdminUser;
            return null;
          }),
        },
      };

      const result = await getCaseCost(mockCtx as any, {
        caseId: mockCase._id,
      });

      expect(result).toHaveProperty("totalCost");
      expect(result).toHaveProperty("totalInputTokens");
      expect(result).toHaveProperty("totalOutputTokens");
      expect(result.totalInputTokens).toBe(5000);
      expect(result.totalOutputTokens).toBe(2000);
      expect(result.totalCost).toBe(0.05);
    });

    test("non-admin user cannot query cost for a case they do not participate in", async () => {
      const mockCase = {
        _id: "case-456" as any,
        partyAUserId: "other-user-a",
        partyBUserId: "other-user-b",
        aiUsage: {
          totalInputTokens: 100,
          totalOutputTokens: 50,
          totalCost: 0.01,
        },
      };
      const mockCtx = {
        auth: {
          getUserIdentity: vi
            .fn()
            .mockResolvedValue({ subject: "non-participant-user" }),
        },
        db: { get: vi.fn().mockResolvedValue(mockCase) },
      };

      await expect(
        getCaseCost(mockCtx as any, { caseId: mockCase._id }),
      ).rejects.toThrow();
    });
  });

  test("multiple model types are tracked separately in cost", () => {
    const sonnetOnly: AiUsageEntry[] = [
      { model: "sonnet", inputTokens: 1000, outputTokens: 500 },
    ];
    const haikuOnly: AiUsageEntry[] = [
      { model: "haiku", inputTokens: 1000, outputTokens: 500 },
    ];

    const sonnetCost = accumulateUsage(sonnetOnly).totalCost;
    const haikuCost = accumulateUsage(haikuOnly).totalCost;

    // Sonnet should cost more than Haiku for same token counts
    expect(sonnetCost).toBeGreaterThan(haikuCost);
  });
});

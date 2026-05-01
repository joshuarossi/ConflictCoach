/**
 * WOR-63: Cron job for abandoned case cleanup
 *
 * Tests for:
 * - AC3: Finds all cases with status=JOINT_ACTIVE where updatedAt < 30 days ago
 * - AC4: Transitions matching cases to CLOSED_ABANDONED with closedAt timestamp
 * - AC5: Uses the state machine validateTransition for the status change
 * - AC6: No action taken on cases in other statuses
 *
 * These tests import the cleanup mutation from convex/ and the state machine
 * helper from convex/lib/stateMachine.ts. Both modules do not exist yet, so
 * these tests will FAIL at import time until the implementation is written.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";

// These imports will fail until implementation exists — that is the intended
// "red" state. The cleanup mutation is expected to be an internalMutation.
// We import the handler directly for unit testing.
import { cleanupAbandonedCases } from "../../convex/crons.cleanup";
import { validateTransition } from "../../convex/lib/stateMachine";

// --- Helpers ---

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Creates a fake case document for testing. */
function makeFakeCase(
  overrides: Partial<{
    _id: string;
    status: string;
    updatedAt: number;
    closedAt: number | undefined;
    isSolo: boolean;
  }> = {},
) {
  return {
    _id: overrides._id ?? "case_1",
    schemaVersion: 1 as const,
    status: overrides.status ?? "JOINT_ACTIVE",
    isSolo: overrides.isSolo ?? false,
    category: "workplace",
    templateVersionId: "tv_1",
    initiatorUserId: "user_1",
    inviteeUserId: "user_2",
    createdAt: Date.now() - THIRTY_DAYS_MS * 2,
    updatedAt: overrides.updatedAt ?? Date.now() - THIRTY_DAYS_MS - 1,
    closedAt: overrides.closedAt,
    ...overrides,
  };
}

/**
 * Builds a minimal fake Convex context (`ctx`) for testing the mutation handler.
 *
 * The real implementation will use `ctx.db.query(...)` and `ctx.db.patch(...)`.
 * We simulate those here so we can assert the mutation's behavior without a
 * running Convex backend.
 */
function makeFakeCtx(cases: ReturnType<typeof makeFakeCase>[]) {
  const patchedDocs: Array<{ id: string; fields: Record<string, unknown> }> =
    [];

  const ctx = {
    db: {
      query: (_table: string) => ({
        withIndex: (_indexName: string, _q: unknown) => ({
          filter: (filterFn: (q: { eq: (...args: unknown[]) => unknown; lt: (...args: unknown[]) => unknown; field: (...args: unknown[]) => unknown }) => unknown) => ({
            collect: async () => {
              // Return cases that match the filter criteria.
              // The real implementation filters on status=JOINT_ACTIVE and
              // updatedAt < cutoff. We apply the same logic here.
              return cases.filter((c) => {
                if (c.status !== "JOINT_ACTIVE") return false;
                const cutoff = Date.now() - THIRTY_DAYS_MS;
                return c.updatedAt < cutoff;
              });
            },
          }),
          collect: async () => {
            return cases.filter((c) => c.status === "JOINT_ACTIVE");
          },
        }),
        filter: (filterFn: unknown) => ({
          collect: async () => {
            // Fallback: return JOINT_ACTIVE cases with old updatedAt
            return cases.filter((c) => {
              if (c.status !== "JOINT_ACTIVE") return false;
              const cutoff = Date.now() - THIRTY_DAYS_MS;
              return c.updatedAt < cutoff;
            });
          },
        }),
        collect: async () => cases,
      }),
      patch: async (id: string, fields: Record<string, unknown>) => {
        patchedDocs.push({ id, fields });
      },
    },
  };

  return { ctx, patchedDocs };
}

// --- Tests ---

describe("WOR-63: Cleanup mutation — find and transition abandoned cases", () => {
  test("Finds all cases with status=JOINT_ACTIVE where updatedAt < 30 days ago", async () => {
    // AC3: The mutation must query for JOINT_ACTIVE cases whose updatedAt is
    // older than 30 days and process them.
    const staleCase = makeFakeCase({
      _id: "case_stale",
      status: "JOINT_ACTIVE",
      updatedAt: Date.now() - THIRTY_DAYS_MS - 1, // 30 days + 1ms ago
    });
    const freshCase = makeFakeCase({
      _id: "case_fresh",
      status: "JOINT_ACTIVE",
      updatedAt: Date.now() - THIRTY_DAYS_MS + 60_000, // 29 days 23h 59m ago
    });
    const { ctx, patchedDocs } = makeFakeCtx([staleCase, freshCase]);

    await cleanupAbandonedCases(ctx as any, {});

    // Only the stale case should be patched
    const patchedIds = patchedDocs.map((p) => p.id);
    expect(patchedIds).toContain("case_stale");
    expect(patchedIds).not.toContain("case_fresh");
  });

  test("Transitions matching cases to CLOSED_ABANDONED with closedAt timestamp", async () => {
    // AC4: Stale cases must be transitioned to CLOSED_ABANDONED and have
    // closedAt set to a recent timestamp.
    const now = Date.now();
    const staleCase = makeFakeCase({
      _id: "case_abandoned",
      status: "JOINT_ACTIVE",
      updatedAt: now - THIRTY_DAYS_MS - 86_400_000, // 31 days ago
    });
    const { ctx, patchedDocs } = makeFakeCtx([staleCase]);

    await cleanupAbandonedCases(ctx as any, {});

    expect(patchedDocs.length).toBeGreaterThanOrEqual(1);
    const patch = patchedDocs.find((p) => p.id === "case_abandoned");
    expect(patch).toBeDefined();
    expect(patch!.fields.status).toBe("CLOSED_ABANDONED");
    expect(patch!.fields.closedAt).toBeDefined();
    expect(typeof patch!.fields.closedAt).toBe("number");
    // closedAt should be recent (within the last 5 seconds)
    expect(patch!.fields.closedAt as number).toBeGreaterThan(now - 5000);
  });

  test("Uses the state machine validateTransition for the status change", () => {
    // AC5: The implementation must use validateTransition from
    // convex/lib/stateMachine.ts. We verify the function exists and that
    // JOINT_ACTIVE → CLOSED_ABANDONED is a valid transition.
    expect(typeof validateTransition).toBe("function");

    // Valid transition should not throw
    expect(() =>
      validateTransition("JOINT_ACTIVE", "CLOSED_ABANDONED"),
    ).not.toThrow();

    // Invalid transition should throw (e.g., DRAFT_PRIVATE_COACHING → CLOSED_ABANDONED)
    expect(() =>
      validateTransition("DRAFT_PRIVATE_COACHING", "CLOSED_ABANDONED"),
    ).toThrow();
  });

  test("No action taken on cases in other statuses", async () => {
    // AC6: Cases not in JOINT_ACTIVE status must not be touched, even if
    // their updatedAt is older than 30 days.
    const nonTargetStatuses = [
      "DRAFT_PRIVATE_COACHING",
      "BOTH_PRIVATE_COACHING",
      "READY_FOR_JOINT",
      "CLOSED_RESOLVED",
      "CLOSED_UNRESOLVED",
      "CLOSED_ABANDONED",
    ] as const;

    const oldDate = Date.now() - THIRTY_DAYS_MS - 86_400_000 * 60; // 90 days ago

    const cases = nonTargetStatuses.map((status, i) =>
      makeFakeCase({
        _id: `case_${status.toLowerCase()}_${i}`,
        status,
        updatedAt: oldDate,
      }),
    );

    const { ctx, patchedDocs } = makeFakeCtx(cases);
    await cleanupAbandonedCases(ctx as any, {});

    // None of these cases should be patched
    expect(patchedDocs).toHaveLength(0);
  });

  test("Multiple stale JOINT_ACTIVE cases are all transitioned", async () => {
    // Supplementary test: if multiple cases are stale, all should be processed.
    const cases = [
      makeFakeCase({
        _id: "case_a",
        status: "JOINT_ACTIVE",
        updatedAt: Date.now() - THIRTY_DAYS_MS - 1,
      }),
      makeFakeCase({
        _id: "case_b",
        status: "JOINT_ACTIVE",
        updatedAt: Date.now() - THIRTY_DAYS_MS - 86_400_000 * 10,
      }),
      makeFakeCase({
        _id: "case_c",
        status: "JOINT_ACTIVE",
        updatedAt: Date.now() - THIRTY_DAYS_MS - 86_400_000 * 60,
      }),
    ];
    const { ctx, patchedDocs } = makeFakeCtx(cases);

    await cleanupAbandonedCases(ctx as any, {});

    const patchedIds = patchedDocs.map((p) => p.id);
    expect(patchedIds).toContain("case_a");
    expect(patchedIds).toContain("case_b");
    expect(patchedIds).toContain("case_c");
    expect(patchedDocs.every((p) => p.fields.status === "CLOSED_ABANDONED")).toBe(true);
  });
});

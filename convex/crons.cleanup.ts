import { validateTransition, type CaseStatus } from "./lib/stateMachine";

const ABANDONED_CASE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type CleanupCase = {
  _id: string;
  status: CaseStatus;
  updatedAt: number;
};

type CleanupCtx = {
  db: {
    query: (table: "cases") => {
      filter?: (predicate: unknown) => {
        collect: () => Promise<CleanupCase[]>;
      };
      collect?: () => Promise<CleanupCase[]>;
    };
    patch: (
      id: string,
      fields: { status: CaseStatus; closedAt: number; updatedAt: number },
    ) => Promise<void>;
  };
};

export async function cleanupAbandonedCases(
  ctx: CleanupCtx,
  _args?: Record<string, never>,
) {
  void _args;
  const now = Date.now();
  const cutoff = now - ABANDONED_CASE_AGE_MS;
  const query = ctx.db.query("cases");
  const candidates = query.filter
    ? await query.filter(() => true).collect()
    : await query.collect?.();

  const staleCases = (candidates ?? []).filter(
    (caseDoc) =>
      caseDoc.status === "JOINT_ACTIVE" && caseDoc.updatedAt < cutoff,
  );

  for (const caseDoc of staleCases) {
    validateTransition(caseDoc.status, "CLOSED_ABANDONED");
    await ctx.db.patch(caseDoc._id, {
      status: "CLOSED_ABANDONED",
      closedAt: now,
      updatedAt: now,
    });
  }

  return { processed: staleCases.length };
}

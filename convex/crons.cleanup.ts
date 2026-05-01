import { internalMutation } from "./_generated/server";
import { validateTransition } from "./lib/stateMachine";

const ABANDONED_CASE_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const cleanupAbandonedCases = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const cutoff = now - ABANDONED_CASE_AGE_MS;

    const allCases = await ctx.db.query("cases").collect();

    const staleCases = allCases.filter(
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
  },
});

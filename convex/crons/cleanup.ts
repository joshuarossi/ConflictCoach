import { internalMutation } from "../_generated/server";
import { cleanupAbandonedCases } from "../crons.cleanup";

export const cleanupAbandonedCasesCron = internalMutation({
  args: {},
  handler: async (ctx) =>
    cleanupAbandonedCases(
      ctx as unknown as Parameters<typeof cleanupAbandonedCases>[0],
      {},
    ),
});

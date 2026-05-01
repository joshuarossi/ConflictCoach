import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

/**
 * Returns the current authenticated user's record.
 */
export const me = query({
  args: {},
  handler: async (ctx) => {
    return await requireAuth(ctx);
  },
});

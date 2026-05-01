/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

/**
 * Returns the current authenticated user's record.
 */
export const me = query({
  args: {},
  handler: async (ctx: any) => {
    return await requireAuth(ctx);
  },
});

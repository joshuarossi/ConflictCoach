import { queryGeneric } from "convex/server";

/**
 * Returns the current authenticated user's identity.
 * Used to verify auth is working and to fetch user info.
 */
export const me = queryGeneric({
  args: {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx: any) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED");
    }

    return { identity };
  },
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation, query } from "./_generated/server";
import { upsertUser, requireAuth } from "./lib/auth";

// Re-export helpers so they can be imported from convex/users
export { upsertUser } from "./lib/auth";

/**
 * Upsert the current user on login.
 * Creates a users row on first login; returns the existing one on subsequent logins.
 */
export const upsert = mutation({
  args: {},
  handler: async (ctx: any) => {
    return await upsertUser(ctx);
  },
});

/**
 * Get the current authenticated user's record.
 */
export const me = query({
  args: {},
  handler: async (ctx: any) => {
    return await requireAuth(ctx);
  },
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";
import { throwAppError } from "./lib/errors";

/**
 * Returns the current authenticated user's record.
 */
export const me = query({
  args: {},
  handler: async (ctx: any) => {
    return await requireAuth(ctx);
  },
});

/**
 * Updates the authenticated caller's displayName.
 */
export const updateDisplayName = mutation({
  args: { displayName: v.string() },
  handler: async (ctx: any, args: { displayName: string }) => {
    const user = await requireAuth(ctx);
    const trimmed = args.displayName.trim();
    if (trimmed.length === 0) {
      throwAppError("INVALID_INPUT", "Display name cannot be empty");
    }
    if (trimmed.length > 80) {
      throwAppError(
        "INVALID_INPUT",
        "Display name must be 80 characters or fewer",
      );
    }
    await ctx.db.patch(user._id, { displayName: trimmed });
  },
});

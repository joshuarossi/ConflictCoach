/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, isAdmin } from "../lib/auth";
import { throwAppError } from "../lib/errors";

// ---------------------------------------------------------------------------
// list — admin-only: return audit log entries, filterable by actor and action
// ---------------------------------------------------------------------------

export const list = query({
  args: {
    actorUserId: v.optional(v.id("users")),
    action: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const user = await requireAuth(ctx);
    if (!isAdmin(user)) {
      throwAppError("FORBIDDEN", "Admin access required");
    }

    let entries;

    if (args.actorUserId) {
      // Use the by_actor index when filtering by actor
      entries = await ctx.db
        .query("auditLog")
        .withIndex("by_actor", (q: any) => q.eq("actorUserId", args.actorUserId))
        .collect();
    } else {
      entries = await ctx.db.query("auditLog").collect();
    }

    // Apply action filter in-memory if provided
    if (args.action) {
      entries = entries.filter((entry: any) => entry.action === args.action);
    }

    // Sort by createdAt descending (newest first)
    entries.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return entries;
  },
});

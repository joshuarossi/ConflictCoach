/* eslint-disable @typescript-eslint/no-explicit-any */
import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, isAdmin } from "../lib/auth";
import { throwAppError } from "../lib/errors";

// ---------------------------------------------------------------------------
// list — admin-only: return audit log entries, filterable by actor and action
// ---------------------------------------------------------------------------

export async function listAuditLogsHandler(ctx: any, args: any) {
  const user = await requireAuth(ctx);
  if (!isAdmin(user)) {
    throwAppError("FORBIDDEN", "Admin access required");
  }

  let entries;

  if (args.actorUserId) {
    // Use the by_actor index when filtering by actor; defensively re-apply
    // the actor filter in-memory in case the underlying iterator returns
    // extra rows (some test mocks ignore the predicate).
    entries = await ctx.db
      .query("auditLog")
      .withIndex("by_actor", (q: any) => q.eq("actorUserId", args.actorUserId))
      .collect();
    entries = entries.filter(
      (entry: any) => entry.actorUserId === args.actorUserId,
    );
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
}

export const list = query({
  args: {
    actorUserId: v.optional(v.id("users")),
    action: v.optional(v.string()),
  },
  handler: listAuditLogsHandler,
});

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
    // Use the by_actor index when filtering by actor; re-filter in-memory
    // for defense-in-depth.
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

  // Enrich entries with actor display names
  const actorIdSet = new Set<string>();
  for (const e of entries) {
    actorIdSet.add(String((e as any).actorUserId));
  }
  const actorMap: Record<string, string> = {};
  for (const actorId of actorIdSet) {
    const actor: any = await ctx.db.get(actorId as any);
    if (actor) {
      actorMap[actorId] = actor.displayName ?? actor.email ?? "Unknown";
    }
  }

  return entries.map((entry: any) => ({
    ...entry,
    actorDisplayName: actorMap[String(entry.actorUserId)] ?? "Unknown",
  }));
}

export const list = query({
  args: {
    actorUserId: v.optional(v.id("users")),
    action: v.optional(v.string()),
  },
  handler: listAuditLogsHandler,
});

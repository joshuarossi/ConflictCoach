/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutation, query } from "./_generated/server";
import {
  upsertUser as upsertUserFn,
  getUserByEmail as getUserByEmailFn,
  requireAuth as requireAuthFn,
  isAdmin as isAdminFn,
} from "./lib/auth";
export type { UserRecord } from "./lib/auth";

// Re-export auth helpers as callable functions
export const upsertUser = upsertUserFn;
export const getUserByEmail = getUserByEmailFn;
export const requireAuthHelper = requireAuthFn;
export const isAdmin = isAdminFn;

/**
 * Upsert the current user on login.
 * Creates a users row on first login; returns the existing one on subsequent logins.
 */
export const upsert = mutation({
  args: {},
  handler: async (ctx: any) => {
    return await upsertUserFn(ctx);
  },
});

/**
 * Get the current authenticated user's record.
 */
export const me = query({
  args: {},
  handler: async (ctx: any) => {
    return await requireAuthFn(ctx);
  },
});

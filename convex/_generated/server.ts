// Placeholder for Convex generated server utilities.
// This file will be replaced when `npx convex dev` runs.
//
// Re-export Generic variants from convex/server so application code
// type-checks before the real generated file exists.

export {
  actionGeneric as action,
  internalActionGeneric as internalAction,
  mutationGeneric as mutation,
  internalMutationGeneric as internalMutation,
  queryGeneric as query,
  internalQueryGeneric as internalQuery,
} from "convex/server";

export type { GenericActionCtx as ActionCtx } from "convex/server";
export type { GenericMutationCtx as MutationCtx } from "convex/server";
export type { GenericQueryCtx as QueryCtx } from "convex/server";

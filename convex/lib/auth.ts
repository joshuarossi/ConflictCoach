import { throwAppError } from "./errors";

/**
 * Branded Id type matching Convex's Id<TableName>.
 * Local definition to avoid depending on _generated/dataModel.
 */
type Id<T extends string> = string & { __tableName: T };

export interface UserRecord {
  _id: Id<"users">;
  email: string;
  displayName?: string;
  role: "USER" | "ADMIN";
  createdAt: number;
}

/**
 * Validates that the caller is authenticated and has a corresponding user
 * record in the database. Returns the user document.
 *
 * Throws UNAUTHENTICATED if no identity is present.
 * Throws UNAUTHENTICATED (USER_NOT_FOUND) if the identity has no matching
 * user row.
 */
export async function requireAuth(
  ctx: { auth: { getUserIdentity: () => Promise<{ email?: string } | null> }; db: any },
): Promise<UserRecord> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throwAppError("UNAUTHENTICATED", "Authentication required");
  }

  const email = identity.email;
  if (!email) {
    throwAppError("UNAUTHENTICATED", "Identity missing email");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();

  if (!user) {
    throwAppError("UNAUTHENTICATED", "User not found");
  }

  return user as UserRecord;
}

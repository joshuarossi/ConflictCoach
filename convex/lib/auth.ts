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

interface Identity {
  subject?: string;
  email?: string;
  tokenIdentifier?: string;
}

interface AuthContext {
  auth: { getUserIdentity: () => Promise<Identity | null> };
  db: {
    get: (id: string) => Promise<UserRecord | null>;
    insert: (table: string, doc: Record<string, unknown>) => Promise<string>;
    query: (table: string) => {
      withIndex: (
        name: string,
        predicate: (q: { eq: (field: string, value: string) => unknown }) => unknown,
      ) => { first: () => Promise<UserRecord | null> };
    };
  };
}

/**
 * Look up a user by email using the by_email index.
 * Returns the user record or null if not found.
 */
export async function getUserByEmail(
  ctx: Pick<AuthContext, "db">,
  email: string,
): Promise<UserRecord | null> {
  return await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
}

/**
 * Upsert a user record on login.
 * - First login: creates a users row with email, role=USER, and createdAt.
 * - Subsequent logins: returns the existing record without duplication.
 */
export async function upsertUser(
  ctx: Pick<AuthContext, "auth" | "db">,
): Promise<UserRecord> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throwAppError("UNAUTHENTICATED", "Authentication required");
  }

  const email = identity.email;
  if (!email) {
    throwAppError("UNAUTHENTICATED", "Identity missing email");
  }

  const existing = await getUserByEmail(ctx, email);
  if (existing) {
    return existing;
  }

  const now = Date.now();
  const id = await ctx.db.insert("users", {
    email,
    role: "USER",
    createdAt: now,
  });

  return {
    _id: id as Id<"users">,
    email,
    role: "USER",
    createdAt: now,
  };
}

/**
 * Validates that the caller is authenticated and has a user record.
 *
 * Throws UNAUTHENTICATED if no identity is present.
 * Throws USER_NOT_FOUND if the identity exists but no user record is found.
 */
export async function requireAuth(ctx: AuthContext): Promise<UserRecord> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throwAppError("UNAUTHENTICATED", "Authentication required");
  }

  const email = identity.email;
  if (!email) {
    throwAppError("UNAUTHENTICATED", "Identity missing email");
  }

  const user = await getUserByEmail(ctx, email);
  if (!user) {
    throwAppError("USER_NOT_FOUND", "User record not found");
  }

  return user;
}

/**
 * Check whether a user has the ADMIN role.
 */
export function isAdmin(user: UserRecord): boolean {
  return user.role === "ADMIN";
}

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
    query: (table: string) => {
      withIndex: (
        name: string,
        predicate: (q: { eq: (field: string, value: string) => unknown }) => unknown,
      ) => { first: () => Promise<UserRecord | null> };
    };
  };
}

/**
 * Validates that the caller is authenticated and returns the user record.
 *
 * In Convex Auth, identity.subject holds the user's _id. We first try to
 * load the full user document from the DB. If the users table hasn't been
 * populated yet (e.g. upsert hasn't run), we trust the verified identity
 * and return a minimal record.
 *
 * Throws UNAUTHENTICATED if no identity is present.
 */
export async function requireAuth(ctx: AuthContext): Promise<UserRecord> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throwAppError("UNAUTHENTICATED", "Authentication required");
  }

  const subject = identity.subject;
  if (!subject) {
    throwAppError("UNAUTHENTICATED", "Identity missing subject");
  }

  // Try to load full user document
  const user = await ctx.db.get(subject);
  if (user) {
    return user;
  }

  // Fallback: trust the verified identity and return a minimal record.
  // This covers cases where the user upsert hasn't run yet or the users
  // table isn't populated in the current context.
  return {
    _id: subject as Id<"users">,
    email: identity.email ?? "",
    role: "USER",
    createdAt: 0,
  };
}

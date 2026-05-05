import { throwAppError } from "./errors";

export interface UserRecord {
  _id: string;
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

interface ReadDbContext {
  get: (id: string) => Promise<UserRecord | null>;
  query: (table: string) => {
    withIndex: (
      name: string,
      predicate: (q: { eq: (field: string, value: string) => unknown }) => unknown,
    ) => { first: () => Promise<UserRecord | null> };
  };
}

export interface AuthContext {
  auth: { getUserIdentity: () => Promise<Identity | null> };
  db: ReadDbContext;
}

export interface MutationAuthContext {
  auth: { getUserIdentity: () => Promise<Identity | null> };
  db: ReadDbContext & {
    insert: (table: string, doc: Record<string, unknown>) => Promise<string>;
  };
}

/**
 * Looks up a user by email using the by_email index.
 * Returns the user record or null if not found.
 */
export async function getUserByEmail(
  ctx: Pick<AuthContext, "db">,
  email: string,
): Promise<UserRecord | null> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  return user ?? null;
}

/**
 * Upserts a user on login. Creates a new user row with email, role=USER,
 * and createdAt if none exists; returns the existing record otherwise.
 * Must be called from a mutation context (needs db.insert).
 */
export async function upsertUser(ctx: MutationAuthContext): Promise<UserRecord> {
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
    _id: id,
    email,
    role: "USER",
    createdAt: now,
  };
}

/**
 * Validates that the caller is authenticated and has a user record.
 *
 * Throws UNAUTHENTICATED if no identity is present.
 * Throws USER_NOT_FOUND if identity exists but no user record is found.
 */
export async function requireAuth(ctx: AuthContext): Promise<UserRecord> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throwAppError("UNAUTHENTICATED", "Authentication required");
  }

  // Convex Auth identity tokens have no `email` claim — only `subject`,
  // which is "<userId>|<sessionId>". The userId half is the `_id` of the
  // row in the `users` table. Look up by that first, then fall back to
  // email (for non-Convex-Auth identity providers that DO include email
  // but no usable subject).
  const subject = identity.subject ?? "";
  const userIdFromSubject = subject.split("|")[0] || null;

  let user: UserRecord | null = null;
  if (userIdFromSubject) {
    try {
      user = (await ctx.db.get(userIdFromSubject)) ?? null;
    } catch {
      // Subject wasn't a valid users-table id; fall through to email lookup.
      user = null;
    }
  }

  if (!user && identity.email) {
    user = await getUserByEmail(ctx, identity.email);
  }

  if (!user) {
    throwAppError("USER_NOT_FOUND", "User record not found");
  }

  return user;
}

/**
 * Returns true if the user has the ADMIN role.
 */
export function isAdmin(user: UserRecord): boolean {
  return user.role === "ADMIN";
}

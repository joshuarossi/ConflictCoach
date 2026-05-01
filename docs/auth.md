# Authentication & Authorization

Conflict Coach uses [Convex Auth](https://docs.convex.dev/auth) for identity verification. On top of that, `convex/lib/auth.ts` provides user provisioning and authorization helpers used across all backend functions.

## User provisioning

When a user logs in for the first time, `upsertUser` creates a row in the `users` table with:

- **email** — from the verified identity
- **role** — defaults to `USER`
- **createdAt** — timestamp of first login

On subsequent logins the existing record is returned. The lookup uses the `by_email` index, so the operation is idempotent and safe to call on every login.

### Roles

Two roles exist in v1:

| Role | Description |
|---|---|
| `USER` | Default role assigned on sign-up |
| `ADMIN` | Manages templates and audit logs. Promoted manually in the database — there is no self-serve endpoint |

## Auth helpers (`convex/lib/auth.ts`)

### `upsertUser(ctx)`

Call from a **mutation** context (requires `db.insert`). Resolves the caller's identity, creates a user record if none exists, and returns the `UserRecord`.

```ts
import { upsertUser } from "./lib/auth";

export const login = mutation(async (ctx) => {
  const user = await upsertUser(ctx);
  // user is guaranteed to exist
});
```

### `requireAuth(ctx)`

Call from any query or mutation context. Returns the caller's `UserRecord` or throws:

| Error code | Condition |
|---|---|
| `UNAUTHENTICATED` | No identity present or identity missing email |
| `USER_NOT_FOUND` | Identity is valid but no user row exists (the user has not been provisioned yet) |

```ts
import { requireAuth } from "./lib/auth";

export const myQuery = query(async (ctx) => {
  const user = await requireAuth(ctx);
  // user is an authenticated, provisioned user
});
```

### `getUserByEmail(ctx, email)`

Looks up a user by email via the `by_email` index. Returns `UserRecord | null`.

### `isAdmin(user)`

Returns `true` if `user.role === "ADMIN"`.

```ts
import { requireAuth, isAdmin } from "./lib/auth";

export const adminOnly = mutation(async (ctx) => {
  const user = await requireAuth(ctx);
  if (!isAdmin(user)) {
    throwAppError("FORBIDDEN", "Admin access required");
  }
  // ...
});
```

## Context types

Two context interfaces are exported for typing custom wrappers:

- **`AuthContext`** — read-only DB access + auth (queries)
- **`MutationAuthContext`** — extends `AuthContext` with `db.insert` (mutations)

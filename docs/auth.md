# Authentication & Authorization

Conflict Coach uses [Convex Auth](https://docs.convex.dev/auth) for identity verification. On top of that, `convex/lib/auth.ts` provides user provisioning and authorization helpers used across all backend functions.

## Login page (`/login`)

The login page (`src/components/SignIn.tsx`) is the primary authentication entry point. It renders a centered 400px card with two sign-in methods:

1. **Magic link** — the user enters their email and clicks "Send magic link". On success the form is replaced with a "Check your email" confirmation message.
2. **Google OAuth** — clicking "Continue with Google" initiates the OAuth flow via Convex Auth.

No password field is presented (per PRD US-01).

### Post-auth redirect

After successful authentication the page redirects to:

- `/dashboard` by default, or
- `/invite/<token>` if an invite token was stashed in `localStorage` (key: `inviteToken`).

The invite token is stashed automatically when the login page receives a `?returnTo=/invite/<token>` query parameter — this ensures the token survives OAuth redirects that leave the app.

### Error handling

Validation and auth errors are rendered inline below the email input. Network-level errors surface via toast (see `docs/error-handling.md`).

### Fine print

The card footer displays "By signing in, you agree to our Terms and Privacy Policy" with links to `/terms` and `/privacy`.

## User provisioning

When a user logs in for the first time, `upsertUser` creates a row in the `users` table with:

- **email** — from the verified identity
- **role** — defaults to `USER`
- **createdAt** — timestamp of first login

On subsequent logins the existing record is returned. The lookup uses the `by_email` index, so the operation is idempotent and safe to call on every login.

### Roles

Two roles exist in v1:

| Role    | Description                                                                                           |
| ------- | ----------------------------------------------------------------------------------------------------- |
| `USER`  | Default role assigned on sign-up                                                                      |
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

| Error code        | Condition                                                                        |
| ----------------- | -------------------------------------------------------------------------------- |
| `UNAUTHENTICATED` | No identity present or identity missing email                                    |
| `USER_NOT_FOUND`  | Identity is valid but no user row exists (the user has not been provisioned yet) |

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

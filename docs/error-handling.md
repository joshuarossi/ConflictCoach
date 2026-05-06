# Error Handling

Conflict Coach uses a standardized error shape across the Convex backend and React client. All errors thrown from Convex functions are wrapped in `ConvexError` with a consistent `{ code, message, httpStatus }` payload.

## Error Codes

| Code              | HTTP Status | When to use                                                                                      |
| ----------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `UNAUTHENTICATED` | 401         | No valid session / identity                                                                      |
| `FORBIDDEN`       | 403         | Authenticated but not authorized for the resource                                                |
| `NOT_FOUND`       | 404         | Resource does not exist                                                                          |
| `USER_NOT_FOUND`  | 404         | Authenticated identity exists but no user record has been provisioned (see [Auth docs](auth.md)) |
| `CONFLICT`        | 409         | State transition not allowed (e.g., acting on a closed case)                                     |
| `INVALID_INPUT`   | 400         | Request validation failed                                                                        |
| `TOKEN_INVALID`   | 400         | Invite token expired or inactive                                                                 |
| `RATE_LIMITED`    | 429         | Upstream rate limit hit                                                                          |
| `AI_ERROR`        | 502         | Upstream AI provider error                                                                       |
| `INTERNAL`        | 500         | Unexpected server failure                                                                        |

## Server-side: `convex/lib/errors.ts`

### `throwAppError(code, message)`

Throws a `ConvexError` with the structured payload. Use this instead of `throw new Error(...)` in all Convex functions.

```ts
import { throwAppError } from "./lib/errors";

// In a mutation or query:
if (!identity) {
  throwAppError("UNAUTHENTICATED", "You must be signed in");
}
```

The error code constants are also exported for type-safe usage:

```ts
import { throwAppError, UNAUTHENTICATED } from "./lib/errors";

throwAppError(UNAUTHENTICATED, "You must be signed in");
```

Unknown codes automatically fall back to `INTERNAL` / 500.

## Client-side: `ConvexErrorBoundary`

`src/components/layout/ConvexErrorBoundary.tsx` is a React error boundary that catches `ConvexError` exceptions thrown during render (e.g. from `useQuery`). It maps error codes to appropriate UI:

- **FORBIDDEN** — renders the `<Forbidden />` component (a full-page "access denied" screen).
- **Other codes** — displays a generic error message with the error's `message` field.
- **Non-Convex errors** — re-thrown so React's default error handling applies.

Wrap any page or subtree that calls Convex queries which may throw authorization errors:

```tsx
import { ConvexErrorBoundary } from "@/components/layout/ConvexErrorBoundary";

export function MyPage() {
  return (
    <ConvexErrorBoundary>
      <MyPageContent />
    </ConvexErrorBoundary>
  );
}
```

The `CaseDetail`, `JointChatPage`, and `PrivateCoachingPage` pages all use this boundary.

## Client-side: `src/lib/errors.ts`

### `parseConvexError(error)`

Extracts `{ code, message }` from any caught error. Handles both `ConvexError` instances (returned by Convex) and plain `Error` objects gracefully.

```ts
import { parseConvexError } from "@/lib/errors";

try {
  await someConvexMutation(args);
} catch (err) {
  const { code, message } = parseConvexError(err);
  // code: "NOT_FOUND", "UNAUTHENTICATED", etc.
  // message: human-readable error message
}
```

For non-`ConvexError` errors, the parser returns `{ code: "INTERNAL", message: <original message or fallback> }`.

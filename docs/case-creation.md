# Case Creation

The `cases/create` Convex mutation is the backend entry point for every new conflict mediation case. It is defined in `convex/cases/create.ts`.

## Input

| Field | Type | Required | Description |
|---|---|---|---|
| `category` | string | Yes | One of `workplace`, `family`, `personal`, `contractual`, or `other`. |
| `mainTopic` | string | Yes | Short summary of the conflict. |
| `description` | string | No | Longer description of the situation. |
| `desiredOutcome` | string | No | What the initiator hopes to achieve. |
| `isSolo` | boolean | No | When `true`, both sides of the case are assigned to the same user (solo mode). Defaults to `false`. |

## What the mutation does

1. **Authenticates** the caller via `requireAuth(ctx)`.
2. **Validates** that `category` is one of the allowed values and `mainTopic` is non-empty.
3. **Pins the template version** by looking up the active template for the given category and recording its `currentVersionId` on the case. This version is immutable for the lifetime of the case.
4. **Creates the case row** with `schemaVersion: 1` and an initial status of `DRAFT_PRIVATE_COACHING` (or `BOTH_PRIVATE_COACHING` for solo mode).
5. **Creates the initiator's party state** (`role: INITIATOR`) with the supplied form fields.
6. For **normal (non-solo) cases**, generates a 32-character url-safe invite token (stored in the `inviteTokens` table with `status: ACTIVE`) and returns `{ caseId, inviteUrl }`.
7. For **solo cases**, creates a second party state (`role: INVITEE`) for the same user, sets `inviteeUserId` to the initiator, and returns `{ caseId }` with no invite URL.

## Invite URL

The invite URL is constructed as `${SITE_URL}/invite/${token}`, where `SITE_URL` is read from the environment (defaults to `https://conflictcoach.app`). See the README for how to configure `SITE_URL`.

## Solo mode

Pass `isSolo: true` to create a case where a single user plays both roles. This is useful for self-guided conflict reflection. In solo mode:

- The case status starts at `BOTH_PRIVATE_COACHING` (skipping the invite step).
- Both `INITIATOR` and `INVITEE` party-state rows are created for the same user.
- No invite token is generated and no `inviteUrl` is returned.

## Error handling

The mutation throws structured `ConvexError` responses using `throwAppError`:

| Code | When |
|---|---|
| `INVALID_INPUT` | Category is not in the allowed set, or `mainTopic` is empty. |
| `NOT_FOUND` | No active template exists for the given category. |

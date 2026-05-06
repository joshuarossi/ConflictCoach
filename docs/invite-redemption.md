# Invite Redemption

The `invites/redeem` Convex mutation is the backend entry point for accepting a case invite. It is defined in `convex/invites/redeem.ts`.

## Input

| Field   | Type   | Required | Description                                                 |
| ------- | ------ | -------- | ----------------------------------------------------------- |
| `token` | string | Yes      | The 32-character url-safe invite token from the invite URL. |

## What the mutation does

1. **Authenticates** the caller via `requireAuth(ctx)`.
2. **Looks up the token** using the `inviteTokens.by_token` index.
3. **Validates the token is ACTIVE.** If the token is `CONSUMED` or `REVOKED` (or does not exist), the mutation throws a `TOKEN_INVALID` error.
4. **Loads the case** associated with the token.
5. **Prevents self-invite.** If the authenticated user is the case's `initiatorUserId`, the mutation throws a `CONFLICT` error.
6. **Validates the case status transition** from `DRAFT_PRIVATE_COACHING` to `BOTH_PRIVATE_COACHING` using the state machine.
7. **Performs atomic writes:**
   - Sets `inviteeUserId` on the case and transitions its status to `BOTH_PRIVATE_COACHING`.
   - Creates a `partyStates` row for the invitee (`role: INVITEE`, no form fields populated — the invitee fills their form in a separate step).
   - Marks the invite token as `CONSUMED`, recording `consumedAt` and `consumedByUserId`.
8. **Returns** `{ caseId }` on success.

## Error handling

The mutation throws structured `ConvexError` responses using `throwAppError`:

| Code            | When                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| `TOKEN_INVALID` | Token does not exist, or its status is `CONSUMED` or `REVOKED`.                                               |
| `NOT_FOUND`     | The case referenced by the token no longer exists.                                                            |
| `CONFLICT`      | The authenticated user is the case initiator (self-invite), or the case status does not allow the transition. |

## Relationship to case creation

The invite token is generated during case creation (`cases/create` — see [Case Creation](case-creation.md)). The token is a single-use credential: once redeemed via this mutation, it cannot be used again. Re-redemption attempts receive a `TOKEN_INVALID` error.

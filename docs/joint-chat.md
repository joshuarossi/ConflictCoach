# Joint Chat

The joint chat phase is where both parties communicate in real time with a neutral AI Coach facilitating. The backend for this phase lives in `convex/jointChat.ts`.

## Convex Functions

### `jointChat/messages` (query)

Reactive query that returns all joint messages for a given case, sorted by `createdAt` ascending. Clients auto-subscribe via Convex's WebSocket transport, so new messages appear in real time.

**Args:**

| Field | Type | Description |
|---|---|---|
| `caseId` | `Id<"cases">` | The case to fetch messages for |

**Access rules:**

- Caller must be authenticated.
- Caller must be a party to the case (verified via `partyStates` lookup). Throws `FORBIDDEN` otherwise.
- Case must be in `JOINT_ACTIVE`, `CLOSED_RESOLVED`, `CLOSED_UNRESOLVED`, or `CLOSED_ABANDONED` status. Any other status throws `CONFLICT`. This allows read-only archive access after a case closes.

### `jointChat/sendUserMessage` (mutation)

Inserts a new joint message with `authorType=USER` and `status=COMPLETE`, then schedules the `generateCoachResponse` action so the AI Coach can evaluate and respond.

**Args:**

| Field | Type | Description |
|---|---|---|
| `caseId` | `Id<"cases">` | The case to post in |
| `content` | `string` | The message body |

**Access rules:**

- Caller must be authenticated.
- Caller must be a party to the case. Throws `FORBIDDEN` otherwise.
- Case must be in `JOINT_ACTIVE` status. Any other status throws `CONFLICT`.

### `jointChat/mySynthesis` (query)

Reactive query that returns the authenticated caller's own `synthesisText` from their `partyStates` record. This lets each party review the guidance generated for them during the joint session.

**Args:**

| Field | Type | Description |
|---|---|---|
| `caseId` | `Id<"cases">` | The case to look up |

**Access rules:**

- Caller must be authenticated.
- Caller must be a party to the case. Throws `FORBIDDEN` otherwise.

**Returns:** `{ synthesisText: string | null }`

## Authorization Model

All three functions use a two-step authorization check:

1. **Authentication** — `requireAuth(ctx)` verifies the caller has a valid session. Throws `UNAUTHENTICATED` if not.
2. **Party membership** — A `partyStates` lookup by `(caseId, userId)` confirms the caller is a party to the case. Throws `FORBIDDEN` if no matching record exists.

## Draft Coach Integration

The joint chat view includes an embedded Draft Coach panel that lets participants privately craft messages with AI assistance before sending them to the joint chat. See [Draft Coach component docs](components/draft-coach.md) for full details.

- The "Draft with Coach" button in the input bar opens the panel.
- The panel is rendered by `ConnectedDraftCoachPanel` alongside `JointChatView`.
- "Send this message" is the only path for a draft to reach the joint chat (via `draftCoach/sendFinalDraft`).
- "Edit before sending" drops the draft text into the joint chat input field for manual editing.

## Key Files

| File | Purpose |
|---|---|
| `convex/jointChat.ts` | All joint chat queries and mutations |
| `convex/lib/auth.ts` | `requireAuth()` authentication helper |
| `convex/lib/errors.ts` | `throwAppError()` standardised error codes |
| `convex/lib/stateMachine.ts` | Case status definitions and transitions |
| `src/components/DraftCoachPanel.tsx` | Draft Coach panel and connected wrapper |
| `src/components/DraftReadyCard.tsx` | Draft-ready card with send/edit/refine/discard actions |

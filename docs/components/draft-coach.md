# Draft Coach

The Draft Coach is a private, AI-assisted message-crafting panel embedded in the joint chat view. It lets participants explore what they want to say, refine tone with the AI coach, and produce a polished draft — all without the other party seeing any of the conversation.

## Components

### `DraftCoachPanel`

The main panel component. Renders as a 420 px side panel on desktop and a full-screen bottom sheet on mobile (< 768 px).

**File:** `src/components/DraftCoachPanel.tsx`

**Key props (`DraftCoachPanelProps`):**

| Prop | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Controls panel visibility |
| `onClose` | `() => void` | Called when the user closes the panel |
| `otherPartyName` | `string` | Interpolated into the privacy banner text |
| `messages` | `DraftCoachMessage[]` | Coach conversation messages |
| `isStreaming` | `boolean` | Whether an AI response is currently streaming |
| `finalDraft` | `string \| null` | When set, the DraftReadyCard is shown |
| `onSendMessage` | `(content: string) => void` | Send a user message to the coach |
| `onDraftItForMe` | `() => void` | Sends the canonical "draft it for me" readiness message |
| `onSendFinalDraft` | `() => void` | Posts the draft to joint chat |
| `onEditDraft` | `(draftText: string) => void` | Drops draft text into the joint chat input |
| `onKeepRefining` | `() => void` | Dismisses the draft card, returns to coaching |
| `onDiscard` | `() => void` | Discards the session and closes the panel |

**Privacy banner:** A persistent banner with a lock icon displays: _"This is private to you. {name} can't see what you're discussing here."_ A hover tooltip provides additional reassurance.

### `DraftReadyCard`

Rendered inside `DraftCoachPanel` when `finalDraft` is set. Displays the draft text in a highlighted card with four action buttons.

**File:** `src/components/DraftReadyCard.tsx`

**Actions:**

| Button | Behaviour |
|---|---|
| **Send this message** (primary) | Calls `draftCoach/sendFinalDraft` — the only path for a draft to reach joint chat |
| **Edit before sending** | Drops the draft text into the joint chat input field and closes the panel |
| **Keep refining with Coach** | Dismisses the card and returns to the coaching conversation |
| **Discard** | Calls `draftCoach/discardSession`, closes the panel, no message is sent |

### `ConnectedDraftCoachPanel`

A data-connected wrapper that wires `DraftCoachPanel` to Convex backend APIs. Used in production; the presentational `DraftCoachPanel` is used directly in tests.

**Backend APIs consumed:**

- `draftCoach/session` (query) — returns the active session and messages
- `draftCoach/startSession` (mutation) — creates a new draft session
- `draftCoach/sendMessage` (mutation) — sends a user message
- `draftCoach/sendFinalDraft` (mutation) — posts the final draft to joint chat
- `draftCoach/discardSession` (mutation) — marks the session as discarded

## Responsive layout

| Viewport | Layout | Details |
|---|---|---|
| Desktop (≥ 768 px) | Side panel | 420 px wide, anchored to the right, `shadow-3` |
| Mobile (< 768 px) | Bottom sheet | Full-screen overlay |

## Integration with Joint Chat

The `ConnectedDraftCoachPanel` is rendered inside `JointChatView`. The "Draft with Coach" button in the joint chat input bar toggles the panel open. When the user chooses "Edit before sending", the draft text is injected into the joint chat's message input field so the user can tweak it before sending manually.

---
task_id: WOR-37
ticket_summary: Post-create invite sharing screen
ac_refs:
  - "Screen shows 'Your case is ready. Send this link to [name].' heading"
  - "Invite link is displayed in a large, monospace copyable field with a 'Copy link' button"
  - "Three share options: Copy for email (mailto:), Copy for text message (shorter), Just copy link"
  - "Expandable 'What should I tell them?' section with suggested sharing language per DesignDoc §4.6"
  - "Secondary CTA: 'Or, start your private coaching now →' links to /cases/:id/private"
  - "Copy button shows success feedback (toast or button state change)"
files:
  - path: src/pages/InviteSharingPage.tsx
    role: connected
    action: create
    exports:
      - "InviteSharingPage — connected page component, default export for the route"
      - "InviteSharingView — presentational inner component, exported for unit tests"
      - "InviteSharingViewProps — prop interface for InviteSharingView"
  - path: src/App.tsx
    role: route
    action: modify
    exports:
      - "App — add /cases/:caseId/invite route under ReadingLayout inside AuthGuard"
  - path: src/components/ui/collapsible.tsx
    role: presentational
    action: create
    exports:
      - "Collapsible, CollapsibleTrigger, CollapsibleContent — shadcn/ui Collapsible primitives"
  - path: src/pages/NewCasePage.tsx
    role: connected
    action: modify
    exports:
      - "NewCasePage — updated handleSubmit to pass inviteUrl and otherPartyName via Router state; solo cases navigate to /cases/:id/private instead of /cases/:id/invite"
  - path: tests/wor-37/invite-sharing-view.test.tsx
    role: test-infrastructure
    action: create
    exports:
      - "Unit tests for InviteSharingView presentational component"
  - path: e2e/wor-37/invite-sharing.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "E2E tests for invite sharing flow (clipboard, mailto, navigation)"
signatures:
  - |
    interface InviteSharingViewProps {
      otherPartyName: string;
      inviteUrl: string;
      mainTopic: string;
      caseId: string;
    }
  - "function InviteSharingView(props: InviteSharingViewProps): JSX.Element"
  - "function InviteSharingPage(): JSX.Element"
queries_used:
  - "api.cases.get — fetches case data; consumes otherPartyName, mainTopic (from partyStates via joined result), status, isSolo"
  - "api.cases.partyStates — fetches self partyState; consumes self.mainTopic for the mailto subject and suggested language"
invariants:
  - "No backend mutations — this page is purely presentational and read-only"
  - "The invite URL is displayed verbatim as returned from the cases/create mutation; it is never constructed or modified client-side"
  - "The inviteUrl is passed to this page via React Router state (set by NewCasePage on navigation); it is NOT re-fetched from the backend"
  - "The page is only reachable for the case initiator when status is DRAFT_PRIVATE_COACHING (normal) or BOTH_PRIVATE_COACHING (solo)"
  - "Solo cases skip this page entirely — NewCasePage navigates solo cases to /cases/:id/private instead"
non_goals:
  - "No SMS/text message API integration — 'Copy for text message' just copies a shorter string to clipboard"
  - "No email-sending API — 'Copy for email' opens a mailto: link in the user's default mail client"
  - "No invite token revocation or management UI on this page"
  - "No tracking of whether the link was actually shared"
tested_by:
  - ac: "Screen shows 'Your case is ready. Send this link to [name].' heading"
    layer: unit
    file: tests/wor-37/invite-sharing-view.test.tsx
  - ac: "Invite link is displayed in a large, monospace copyable field with a 'Copy link' button"
    layer: unit
    file: tests/wor-37/invite-sharing-view.test.tsx
  - ac: "Three share options: Copy for email (mailto:), Copy for text message (shorter), Just copy link"
    layer: both
    file: tests/wor-37/invite-sharing-view.test.tsx
  - ac: "Expandable 'What should I tell them?' section with suggested sharing language per DesignDoc §4.6"
    layer: unit
    file: tests/wor-37/invite-sharing-view.test.tsx
  - ac: "Secondary CTA: 'Or, start your private coaching now →' links to /cases/:id/private"
    layer: unit
    file: tests/wor-37/invite-sharing-view.test.tsx
  - ac: "Copy button shows success feedback (toast or button state change)"
    layer: both
    file: tests/wor-37/invite-sharing-view.test.tsx
---

# Contract: WOR-37 — Post-create invite sharing screen

## Why this work exists

After a case is created, the initiator needs to share the invite link with the other party. If this link never gets shared, the case stalls forever at DRAFT_PRIVATE_COACHING. This screen is a critical conversion point — it provides multiple sharing affordances (email, text, raw copy) and suggested messaging so the initiator doesn't have to figure out how to explain the product to the invitee.

## Files and exports

### `src/pages/InviteSharingPage.tsx` (create, connected)

This file follows the established pattern from `ClosedCasePage.tsx`: a presentational inner component (`InviteSharingView`) that takes explicit props, and a connected wrapper (`InviteSharingPage`) that reads from Convex and React Router.

**`InviteSharingView`** is the presentational component exported for unit testing. It receives `otherPartyName`, `inviteUrl`, `mainTopic`, and `caseId` as props. It renders:

- A heading: "Your case is ready. Send this link to {otherPartyName}."
- A large monospace copyable field showing the full `inviteUrl` with a "Copy link" button.
- Three share option buttons (email via mailto:, text message copy, plain copy).
- An expandable "What should I tell them?" section (uses Collapsible).
- A secondary CTA linking to `/cases/${caseId}/private`.

**`InviteSharingPage`** is the connected wrapper. It reads `inviteUrl` from React Router's `location.state` (set by `NewCasePage` during navigation). It calls `api.cases.get` to fetch `otherPartyName` and `api.cases.partyStates` to fetch `self.mainTopic`. It passes everything down to `InviteSharingView`.

The connected-vs-presentational split is the key decision. Tests import `InviteSharingView` directly with mock props — no Convex mocking needed for the core UI assertions. The connected `InviteSharingPage` is tested via E2E.

### `src/App.tsx` (modify, route)

Add the route `/cases/:caseId/invite` under the `ReadingLayout` group inside `AuthGuard`. Import `InviteSharingPage` from `@/pages/InviteSharingPage`. This route sits alongside `/cases/:caseId`, `/cases/:caseId/ready`, and `/cases/:caseId/closed` in the reading-width layout group.

### `src/components/ui/collapsible.tsx` (create, presentational)

Standard shadcn/ui Collapsible component (`@radix-ui/react-collapsible`). Exports `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`. This is a generic UI primitive needed for the expandable "What should I tell them?" section. Follow the same pattern as other shadcn/ui components in `src/components/ui/`.

## Data dependencies

### `api.cases.get` (query, existing)

Returns the case document plus `otherPartyName` (resolved from the other party's user record). This page consumes:

- `otherPartyName` — displayed in the heading ("Send this link to {name}")
- `status` — to guard that the page is valid for this case state
- `category` — not directly used, but available
- `isSolo` — if true, this page shouldn't be shown (solo cases skip invite)

### `api.cases.partyStates` (query, existing)

Returns `self` (the caller's party state) and `otherPartyName`. This page consumes:

- `self.mainTopic` — used in the mailto: subject line and the suggested sharing language where `[topic]` is interpolated

### `inviteUrl` via React Router state

The `inviteUrl` is returned from the `cases/create` mutation and passed to this page via `navigate(`/cases/${caseId}/invite`, { state: { inviteUrl } })` in `NewCasePage`. This avoids needing a backend query to retrieve the invite URL. If `location.state.inviteUrl` is missing (e.g., direct navigation), the page should show a fallback message or redirect to the case detail.

## Invariants

### No backend mutations

This page is purely read-only. It calls no mutations or actions. All share functionality is client-side only (Clipboard API, mailto: links).

### Invite URL is verbatim from server

The `inviteUrl` is constructed server-side in `convex/cases/create.ts` using `SITE_URL` env var + the generated token. The frontend displays it exactly as received. The frontend never constructs invite URLs.

### inviteUrl comes from Router state, not a query

The invite URL is ephemeral — it's returned from the create mutation and passed through navigation state. There is no Convex query that returns the raw invite URL (the `inviteTokens` table stores the token, not the full URL). If Router state is missing, the page degrades gracefully.

### Solo cases skip this page

`NewCasePage` already navigates to `/cases/${caseId}/invite` after case creation. For solo cases (`isSolo: true`), the create mutation returns no `inviteUrl`, and the navigation target should be `/cases/${caseId}/private` instead. This means `NewCasePage.handleSubmit` needs a conditional: if `result.inviteUrl` exists, navigate to invite; otherwise, navigate to private. **This is a modification to `NewCasePage.tsx`** — currently it always navigates to `/cases/${caseId}/invite`. The contract adds `NewCasePage.tsx` as a modified file for this reason.

**Update to files list:** `src/pages/NewCasePage.tsx` is also modified (conditional navigation for solo vs. normal cases).

## Edge cases

### Loading state

While `api.cases.get` or `api.cases.partyStates` is loading (`=== undefined`), show skeleton placeholders matching the page layout (heading skeleton, link field skeleton, button skeletons). Follow the pattern from `ClosedCasePage.tsx`.

### Missing inviteUrl (direct navigation)

If a user navigates directly to `/cases/:caseId/invite` without Router state (e.g., bookmark, page refresh), `location.state?.inviteUrl` will be undefined. In this case, show a message like "This link is no longer available. Check your case dashboard." with a link to `/dashboard`. Do NOT attempt to reconstruct the invite URL client-side.

### Clipboard API unavailable

If `navigator.clipboard.writeText` is unavailable (e.g., non-HTTPS context, browser restriction), the invite link is already visible in the monospace field which should be a readonly `<input>` element so the user can manually select and copy. The copy button should either not appear or show a "Select the link above to copy" fallback.

### Copy success feedback

After a successful `navigator.clipboard.writeText()`, the copy button text changes to "Copied!" (or a checkmark icon) for ~2 seconds, then reverts. This is button-local state, not a toast. This matches the simpler pattern — no need for the toast system for a single-button feedback.

### Other party name missing

If `otherPartyName` is empty (invitee hasn't joined yet, which is always the case on this page), fall back to "the other party" in the heading. However, note that `otherPartyName` on this page refers to the name the initiator typed during case creation — it's in the `partyStates` record, not the `users` table. Actually, the cases/create mutation does NOT store the other party's name (it only stores `mainTopic`, `description`, `desiredOutcome`). The DesignDoc §4.6 shows "Send this link to Jordan" — this name comes from somewhere. Looking at the NewCaseForm, the form collects `otherPartyName` as step 5. **This means `otherPartyName` must be passed through Router state alongside `inviteUrl`**, or the create mutation should be extended to store it. The simplest approach: pass it through Router state from NewCasePage, since the form already has it.

**Updated InviteSharingViewProps note:** `otherPartyName` comes from Router state (set by NewCasePage from the form value), not from `api.cases.get`. The `api.cases.get` query's `otherPartyName` resolves the _other user's_ display name, which is empty until the invite is redeemed.

## Non-goals

- **No SMS/text message API integration.** "Copy for text message" copies a shorter string to the clipboard. It does not send an actual text message.
- **No email-sending backend.** "Copy for email" opens a `mailto:` link. The app does not send emails.
- **No invite management.** No revoke, resend, or expiry controls on this page.
- **No share-tracking analytics.** Whether the link was actually shared is not tracked.
- **No Collapsible animation polish** beyond what Radix provides by default.

## Test coverage

### AC: Heading with name → `tests/wor-37/invite-sharing-view.test.tsx` (unit)

Render `InviteSharingView` with `otherPartyName="Jordan"`. Assert heading text contains "Send this link to Jordan".

### AC: Copyable link field → `tests/wor-37/invite-sharing-view.test.tsx` (unit)

Render with a known `inviteUrl`. Assert the monospace field displays the full URL. Assert the field has `font-family: monospace` (or the `font-mono` class). Assert the "Copy link" button exists.

### AC: Three share options → `tests/wor-37/invite-sharing-view.test.tsx` (unit) + `e2e/wor-37/invite-sharing.spec.ts` (e2e)

Unit: Assert three share buttons exist with correct labels. Assert the "Copy for email" button renders an `<a>` with `href` starting with `mailto:`. Assert `mailto:` body contains the invite URL.
E2E: Click "Just copy link", verify clipboard contains the raw URL. Click "Copy for text message", verify clipboard contains shortened text with the URL.

### AC: Expandable suggested language → `tests/wor-37/invite-sharing-view.test.tsx` (unit)

Assert the collapsible section is collapsed by default (suggested language text is not visible). Click the trigger. Assert the suggested language text is now visible and contains "I found this thing called Conflict Coach".

### AC: Secondary CTA → `tests/wor-37/invite-sharing-view.test.tsx` (unit)

Assert an element with text matching "start your private coaching now" exists. Assert it links to `/cases/${caseId}/private` (check `href` attribute).

### AC: Copy feedback → `tests/wor-37/invite-sharing-view.test.tsx` (unit) + `e2e/wor-37/invite-sharing.spec.ts` (e2e)

Unit: Mock `navigator.clipboard.writeText`. Click the "Copy link" button. Assert the button text changes to "Copied!" (or similar success state). Assert it reverts after a timeout.
E2E: Click copy, verify visual feedback appears.

## Open questions

1. **Where does `otherPartyName` come from?** The DesignDoc shows "Send this link to Jordan" but the `cases/create` mutation doesn't store the other party's name. The `NewCaseForm` collects it as step 5. The contract assumes it's passed through Router state. If the team prefers storing it on the case or partyState record, the create mutation would need a new `otherPartyName` arg. The Router-state approach is simpler and avoids a schema change — the name is only needed on this one page.

2. **Should `NewCasePage` be updated now or separately?** `NewCasePage` currently always navigates to `/cases/${caseId}/invite`. For solo cases, it should navigate to `/cases/${caseId}/private` instead, and it should pass `{ inviteUrl, otherPartyName }` in Router state. This is a small change that logically belongs to this ticket since the invite page depends on it.

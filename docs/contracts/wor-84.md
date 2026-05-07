---
task_id: WOR-84
ticket_summary: "TopNav: solo-mode party toggle missing (DesignDoc §3.2)"
ac_refs:
  - "src/components/layout/TopNav.tsx detects solo cases and renders the PartyToggle in the case-route header, between the case label and the user menu (style-guide §12 mockup: back-link, case-label, party-toggle, user-menu — in that order, with party-toggle margin-left:auto)"
  - "Container styling matches style-guide §12: bg-coach-subtle, border border-coach-accent, rounded-md, p-0.5 (3px ≈ Tailwind p-0.5)"
  - '"VIEWING AS" label uppercase, text-coach-accent, font-size 11px, letter-spacing 0.05em'
  - "Active segment: bg-surface, text-text-primary, shadow-1"
  - "Inactive segment: text-text-secondary, hover:text-text-primary"
  - "Clicking a segment calls the existing useActingParty hook (or equivalent state mechanism) to flip which party context downstream views render"
  - "Hidden on case routes where isSolo: false"
  - "Hidden on case-less routes (Dashboard, Profile, /admin/*)"
files:
  - path: src/components/layout/TopNav.tsx
    role: connected
    action: modify
    exports:
      - "TopNav — connected layout component; now self-detects solo mode and renders PartyToggle + UserMenu in case-route header"
      - "TopNavProps — interface (unchanged: { children?: ReactNode })"
  - path: src/components/PartyToggle.tsx
    role: presentational
    action: modify
    exports:
      - "PartyToggle — presentational segmented control; takes no props, reads ?as query param internally"
signatures:
  - "export function TopNav({ children }: TopNavProps): JSX.Element"
  - "export function PartyToggle(): JSX.Element"
queries_used:
  - "api.cases.get — called by TopNav (already present) to get case context including isSolo"
invariants:
  - "PartyToggle is ONLY rendered when on a case route AND caseContext.isSolo === true"
  - "PartyToggle is NEVER rendered on case-less routes or when isSolo is false"
  - "Active segment uses bg-surface (NOT bg-coach-accent) per style-guide §12"
  - "Container background is bg-coach-subtle with border-coach-accent"
  - "The ?as search param is the sole source of truth for which party is active (initiator | invitee)"
  - "Case-route header order: back-link, case-label, party-toggle (ml-auto), user-menu"
non_goals:
  - "No changes to useActingPartyUserId hook — it already reads ?as param correctly"
  - "No changes to AppLayout.tsx beyond removing the now-redundant solo-mode PartyToggle pass-through (TopNav owns this)"
  - "No new Convex queries or mutations — cases.get already returns isSolo"
  - "No dark-mode-specific overrides — design tokens handle light/dark automatically"
tested_by:
  - ac: "src/components/layout/TopNav.tsx detects solo cases and renders the PartyToggle in the case-route header"
    layer: unit
    file: tests/wor-84/topnav-party-toggle.test.tsx
    reason: ""
  - ac: "Container styling matches style-guide §12: bg-coach-subtle, border border-coach-accent, rounded-md, p-0.5"
    layer: unit
    file: tests/wor-84/party-toggle-styling.test.tsx
    reason: ""
  - ac: '"VIEWING AS" label uppercase, text-coach-accent, font-size 11px, letter-spacing 0.05em'
    layer: unit
    file: tests/wor-84/party-toggle-styling.test.tsx
    reason: ""
  - ac: "Active segment: bg-surface, text-text-primary, shadow-1"
    layer: unit
    file: tests/wor-84/party-toggle-styling.test.tsx
    reason: ""
  - ac: "Inactive segment: text-text-secondary, hover:text-text-primary"
    layer: unit
    file: tests/wor-84/party-toggle-styling.test.tsx
    reason: ""
  - ac: "Clicking a segment calls the existing useActingParty hook (or equivalent state mechanism) to flip which party context downstream views render"
    layer: unit
    file: tests/wor-84/party-toggle-interaction.test.tsx
    reason: ""
  - ac: "Hidden on case routes where isSolo: false"
    layer: unit
    file: tests/wor-84/topnav-party-toggle.test.tsx
    reason: ""
  - ac: "Hidden on case-less routes (Dashboard, Profile, /admin/*)"
    layer: unit
    file: tests/wor-84/topnav-party-toggle.test.tsx
    reason: ""
---

# Contract: WOR-84 — TopNav: solo-mode party toggle missing (DesignDoc §3.2)

## Why this work exists

Solo-mode cases need a chrome-level affordance for switching between viewing-as-Alex and viewing-as-Jordan. The PartyToggle component exists but is not rendered by TopNav itself — it's passed as children by AppLayout. The ticket requires TopNav to self-detect solo mode and render the toggle internally, with styling that matches style-guide §12's segmented-control spec. The current PartyToggle styling is also wrong (uses bg-coach-accent on active instead of bg-surface).

## Files and exports

### `src/components/layout/TopNav.tsx` (modify, connected)

TopNav already queries `api.cases.get` and has access to `caseContext`. The modification adds:

1. Reading `isSolo` from the caseContext response (it's already returned by `cases.get` via the `...caseDoc` spread).
2. When `isCaseRoute && caseContext?.isSolo === true`, rendering `<PartyToggle />` between the case label and the user menu.
3. Adding `<UserMenu />` to the case-route header (currently it only appears on the dashboard route). The order must be: back-link → case-label → PartyToggle (with `ml-auto`) → UserMenu.

TopNav remains a connected component. It continues to accept `children` for backwards compatibility, but the solo-mode PartyToggle is no longer passed in via children — TopNav owns it.

### `src/components/PartyToggle.tsx` (modify, presentational)

PartyToggle stays a zero-prop component that reads `?as` from URL search params. The modifications are purely CSS/structure:

1. **Add "VIEWING AS" label** inside the container: `<span>` with uppercase, `text-coach-accent`, font-size 11px (`text-[11px]`), `font-medium`, `tracking-[0.05em]`, padding `px-2`.
2. **Container**: change to `bg-coach-subtle`, keep `border border-coach-accent`, keep `rounded-md`, add `p-0.5` (≈3px), add `items-center gap-0`.
3. **Active segment**: change from `bg-coach-accent text-accent-on` to `bg-surface text-text-primary shadow-1`, add `rounded-sm`.
4. **Inactive segment**: change from `bg-surface text-coach-accent` to transparent background, `text-text-secondary`, `hover:text-text-primary`, add `rounded-sm`.
5. **Button sizing**: `px-3 py-1.5` (6px 12px), `text-[13px]`, `font-medium`.

PartyToggle is presentational — it has no data-fetching hooks. It reads and writes URL search params only.

### `src/components/layout/AppLayout.tsx` (modify)

Remove the solo-mode PartyToggle pass-through. AppLayout currently queries `cases.get` just to check `isSolo` and conditionally passes `<PartyToggle />` as TopNav children. Since TopNav now owns this internally, AppLayout can stop querying `cases.get` and stop importing PartyToggle. The `<TopNav>` call becomes simply `<TopNav />` (no children for solo mode). AppLayout may still pass other children if needed.

**Note:** This file is listed for completeness. The implementation author should clean up the redundant query and import, but the primary deliverables are TopNav and PartyToggle.

## Data dependencies

### `api.cases.get`

Already called by TopNav with `{ caseId: params.caseId }` when on a case route. Returns the full case document spread plus `otherPartyName`. The relevant fields for this ticket:

- `isSolo: boolean` — determines whether PartyToggle renders
- `status: string` — used by existing phase label logic (unchanged)
- `otherPartyName: string` — used by existing case label logic (unchanged)

No new queries needed. The `isSolo` field is already part of the case document schema and is returned by `cases.get` via `{ ...caseDoc, otherPartyName }`.

## Invariants

### PartyToggle visibility is strictly gated

PartyToggle renders if and only if: (a) the current route is a case route (`params.caseId` is present), AND (b) the case's `isSolo` field is `true`. Both conditions must be true. On dashboard, profile, admin, or non-solo case routes, the toggle must not appear in the DOM at all.

### Active segment uses bg-surface, NOT bg-coach-accent

The DesignDoc's "prominent + coach-accent" wording refers to the container chrome (border, label color, subtle background). The active segment is a raised white chip (`bg-surface`) on the colored track — the standard segmented-control idiom. Using `bg-coach-accent` on the active segment is explicitly called out as wrong in the ticket.

### URL search param is the sole state source

The `?as=initiator|invitee` search param is the single source of truth. PartyToggle reads it to determine which segment is active and writes it on click. The downstream `useActingPartyUserId` hook also reads this param. There is no React state, no context provider, and no Convex mutation for party switching.

### Case-route header element order

Per style-guide §12: back-link, case-label, party-toggle, user-menu. The party-toggle sits at `ml-auto` to push itself and the user-menu to the right. This means TopNav's case-route branch needs to add `<UserMenu />` (currently only rendered in the dashboard branch).

## Edge cases

### Loading state

When `caseContext` is `undefined` (query still loading), `isSolo` is unknown. PartyToggle should NOT render during loading — only render when `caseContext?.isSolo === true` is definitively true. This avoids a flash of the toggle on non-solo cases.

### Direct navigation with ?as param

If a user navigates directly to `/cases/:id/private?as=invitee`, PartyToggle should render with the "Jordan" segment active immediately. No special handling needed — `useSearchParams` reads the initial URL.

### Missing ?as param

When `?as` is absent, PartyToggle defaults to "initiator" (the existing convention in both PartyToggle and useActingPartyUserId). The "Alex" segment should appear active.

## Non-goals

- **No changes to `useActingPartyUserId`** — the hook already correctly reads `?as` and maps it to a userId via `api.cases.partyStates`. This ticket doesn't touch the hook.
- **No new Convex queries or mutations** — `cases.get` already returns `isSolo`. No backend work.
- **No dark-mode-specific CSS** — the design tokens (`bg-surface`, `bg-coach-subtle`, `text-coach-accent`, etc.) automatically resolve to dark-mode values. No conditional dark-mode classes needed.
- **No changes to the party names "Alex" and "Jordan"** — these are hardcoded in the current PartyToggle and match the DesignDoc. Dynamic party names from the case document are out of scope.

## Test coverage

### `tests/wor-84/topnav-party-toggle.test.tsx` (unit)

Covers the TopNav integration:

- **AC: TopNav detects solo cases** — render TopNav in a case route context with a mocked `cases.get` returning `{ isSolo: true }`, assert `party-toggle` testid is in the DOM.
- **AC: Hidden when isSolo: false** — render TopNav with mocked `cases.get` returning `{ isSolo: false }`, assert `party-toggle` testid is NOT in the DOM.
- **AC: Hidden on case-less routes** — render TopNav without a caseId param (dashboard route), assert `party-toggle` testid is NOT in the DOM.
- Verify element order: back-link appears before party-toggle, party-toggle appears before user-menu.

### `tests/wor-84/party-toggle-styling.test.tsx` (unit)

Covers the PartyToggle visual contract:

- **AC: Container styling** — assert the container element has classes `bg-coach-subtle`, `border-coach-accent`, `rounded-md`, `p-0.5`.
- **AC: VIEWING AS label** — assert a text node with "VIEWING AS" exists, has `text-coach-accent`, uppercase.
- **AC: Active segment** — with `?as=initiator`, assert the Alex button has `bg-surface`, `text-text-primary`, `shadow-1`.
- **AC: Inactive segment** — with `?as=initiator`, assert the Jordan button has `text-text-secondary`.

### `tests/wor-84/party-toggle-interaction.test.tsx` (unit)

Covers the click behavior:

- **AC: Clicking a segment flips party context** — click the Jordan button, assert `?as=invitee` appears in the URL. Click Alex button, assert `?as=initiator`.
- Default state (no `?as` param) shows Alex as active.

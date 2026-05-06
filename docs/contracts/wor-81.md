---
task_id: WOR-81
ticket_summary: "The privacy banner looks weird"
ac_refs:
  - "Banner has rounded corners (matching ClosureConfirmationBanner / SoloBanner visual language)"
  - "Banner has a subtle border"
  - "Banner has vertical margin from siblings (not a flush full-width strip)"
  - "Lock-icon button has a visible focus ring"
files:
  - path: src/components/PrivacyBanner.tsx
    role: presentational
    action: modify
    exports:
      - "PrivacyBanner — add rounded-md, border, margin, and focus-ring-accent classes to match sibling banner components"
  - path: tests/wor-42/__snapshots__/privacy-banner-visual-style.test.tsx.snap
    role: test-infrastructure
    action: modify
    exports:
      - "Snapshot auto-updated to reflect new class list on the banner div and lock button"
  - path: tests/wor-81/privacy-banner-styling.test.tsx
    role: test-infrastructure
    action: create
    exports:
      - "Unit tests verifying rounded corners, border, margin, and focus ring classes on PrivacyBanner"
  - path: e2e/wor-81/privacy-banner-visual.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "E2E test verifying the banner renders with border-radius, border, margin, and a visible focus ring in a real browser"
signatures:
  - "PrivacyBanner(props: { text: string; otherPartyName?: string }): JSX.Element — signature unchanged; only className strings change"
queries_used: []
invariants:
  - "PrivacyBanner outer div includes rounded-md (matching ClosureConfirmationBanner)"
  - "PrivacyBanner outer div includes a border using design-token border color (border border-border-default or border border-accent/30)"
  - "PrivacyBanner outer div includes horizontal and bottom margin (mx-4 mb-2) so it is not a flush full-width strip"
  - "Lock-icon button focus ring includes focus:ring-accent so the ring is visibly colored, not transparent"
  - "All classes use design tokens — no raw Tailwind color/size literals (enforced by tests/wor-80/token-usage.test.ts)"
  - "No behavioral changes — props, state, event handling, modal behavior all remain identical"
non_goals:
  - "Changing PrivacyBanner props, state management, or modal behavior"
  - "Modifying the SoloBanner or ClosureConfirmationBanner components"
  - "Adding new design tokens — all needed tokens already exist"
  - "Changing the privacy banner's background color (bg-private-tint is correct; PR #80 already fixed it)"
tested_by:
  - ac: "Banner has rounded corners"
    layer: unit
    file: tests/wor-81/privacy-banner-styling.test.tsx
  - ac: "Banner has a subtle border"
    layer: unit
    file: tests/wor-81/privacy-banner-styling.test.tsx
  - ac: "Banner has vertical margin from siblings"
    layer: unit
    file: tests/wor-81/privacy-banner-styling.test.tsx
  - ac: "Lock-icon button has a visible focus ring"
    layer: both
    file: tests/wor-81/privacy-banner-styling.test.tsx
    reason: "Unit test checks the class is present; e2e test verifies the ring is actually visible when focused in a real browser"
---

# Contract: WOR-81 — The privacy banner looks weird

## Why this work exists

The PrivacyBanner component shipped with WOR-42 as a flat, full-width strip
(`bg-private-tint flex items-center gap-2 px-4 py-2`) with no rounded corners,
no border, no margin from siblings, and an uncolored focus ring on the lock
button. The sibling banners (ClosureConfirmationBanner, SoloBanner) use
rounded corners, borders, and margins. The visual inconsistency was noted in
Chrome 122 on macOS in both light and dark mode. PR #80 already fixed the
dark-mode background color; this ticket addresses the four remaining cosmetic
issues.

## Files and exports

### `src/components/PrivacyBanner.tsx` (modify)

This is the only application file that changes. It is a **presentational**
component — it takes `text` and optional `otherPartyName` props, manages only
local modal-open state, and renders a region with a lock button and text.

The outer `<div>` className changes from:

```
bg-private-tint flex items-center gap-2 px-4 py-2
```

to (approximately):

```
mx-4 mb-2 rounded-md border border-border-default bg-private-tint flex items-center gap-2 px-4 py-3
```

The lock `<button>` className changes from:

```
inline-flex shrink-0 items-center justify-center rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2
```

to:

```
inline-flex shrink-0 items-center justify-center rounded-sm focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2
```

The key additions are:
- `rounded-md` — matches ClosureConfirmationBanner
- `border border-border-default` — subtle border using design token (alternatively `border-accent/30` to match ClosureConfirmationBanner more closely; either is acceptable since both are token-based)
- `mx-4 mb-2` — horizontal and bottom margin matching ClosureConfirmationBanner spacing
- `focus:ring-accent` on the lock button — makes the focus ring visible by giving it the accent color, consistent with focus patterns used elsewhere in the codebase (`focus:ring-accent` appears on inputs, tabs, etc.)

No props, return type, state, event handling, or modal behavior changes.

### `tests/wor-42/__snapshots__/privacy-banner-visual-style.test.tsx.snap` (modify)

The existing snapshot test will fail because the class string changed. The
snapshot must be regenerated (`vitest --update`). This is expected — the
snapshot exists to detect unintended changes, and this is an intended change.

### `tests/wor-81/privacy-banner-styling.test.tsx` (create)

Unit tests that render `<PrivacyBanner text="..." />` and assert:
- The banner's outer element includes `rounded-md` in its className
- The banner's outer element includes `border` in its className
- The banner's outer element includes `mx-4` and `mb-2` (or equivalent margin classes)
- The lock button includes `focus:ring-accent` in its className

### `e2e/wor-81/privacy-banner-visual.spec.ts` (create)

E2E test that navigates to a private coaching page and:
- Asserts the banner has computed `border-radius` > 0
- Asserts the banner has a visible border (`borderWidth` > 0)
- Tabs to the lock button and asserts the focus ring is visible (computed `outline` or `box-shadow` is non-zero when focused)

## Data dependencies

None. This is a purely presentational change. The PrivacyBanner does not call
any Convex queries or mutations — it receives its text content via props.

## Invariants

### Rounded corners
The banner outer div must include `rounded-md` to match the visual language of
ClosureConfirmationBanner. Without it, the banner renders as a flat strip that
looks out of place among the rounded siblings.

### Subtle border
The banner outer div must include a border using a design-token color class.
The ClosureConfirmationBanner uses `border border-accent/30`; alternatively
`border border-border-default` is acceptable. Raw Tailwind colors like
`border-gray-200` are not permitted per WOR-80 invariants.

### Vertical margin from siblings
The banner must not be a flush full-width strip. Adding `mx-4 mb-2` matches
ClosureConfirmationBanner's spacing pattern and ensures the banner has visual
breathing room.

### Visible focus ring on lock button
The lock button's `focus:ring-2 focus:ring-offset-2` produces an invisible ring
because no ring color is specified (defaults to transparent in some browsers).
Adding `focus:ring-accent` gives it the project's standard accent color, matching
the focus ring pattern used on inputs and tabs throughout the codebase.

### No behavioral changes
Props, state, event handling, modal open/close, screen reader text, and
accessibility attributes must remain identical. Only className strings change.

## Edge cases

### Loading state
Not applicable — PrivacyBanner is a synchronous presentational component with
no data fetching. It renders immediately with whatever props it receives.

### Empty state
If `text` is an empty string, the banner still renders (it's a privacy notice
container). The visual fixes apply regardless of text content.

### Error state
Not applicable — no data fetching or mutation calls that could error.

### Dark mode
The `bg-private-tint` token is already wired to `#2D2924` in dark mode
(confirmed in `src/globals.css`). The border token (`border-border-default` or
`border-accent/30`) and focus ring token (`ring-accent`) are also theme-aware.
No dark-mode-specific work needed.

## Non-goals

- **Changing PrivacyBanner props or behavior** — the component signature stays
  identical. No new props, no state changes, no modal behavior changes.
- **Modifying SoloBanner or ClosureConfirmationBanner** — those are the
  reference; they don't need changes.
- **Adding new design tokens** — `rounded-md`, `border-border-default`,
  `ring-accent`, `mx-4`, `mb-2` all already exist and are in use.
- **Fixing the background color** — PR #80 already resolved the dark-mode
  `bg-private-tint` issue. This ticket addresses the four remaining cosmetic
  problems (corners, border, margin, focus ring).

## Test coverage

### AC: Banner has rounded corners
**Layer:** unit | **File:** `tests/wor-81/privacy-banner-styling.test.tsx`
Renders `<PrivacyBanner text="..." />` and asserts the outer element's className
includes `rounded-md`.

### AC: Banner has a subtle border
**Layer:** unit | **File:** `tests/wor-81/privacy-banner-styling.test.tsx`
Renders and asserts the outer element's className includes a `border` class with
a design-token color.

### AC: Banner has vertical margin from siblings
**Layer:** unit | **File:** `tests/wor-81/privacy-banner-styling.test.tsx`
Renders and asserts the outer element's className includes margin classes
(`mx-4`, `mb-2`).

### AC: Lock-icon button has a visible focus ring
**Layer:** both | **File:** `tests/wor-81/privacy-banner-styling.test.tsx` +
`e2e/wor-81/privacy-banner-visual.spec.ts`
Unit test checks the button's className includes `focus:ring-accent`. E2E test
focuses the button and verifies the computed focus ring is visible (non-zero
box-shadow or outline), because className presence alone doesn't guarantee
browser rendering.

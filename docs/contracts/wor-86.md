---
task_id: WOR-86
ticket_summary: "PrivacyBanner: full-bleed with bottom border (style-guide.html §08), not rounded card"
ac_refs:
  - "Outer div: flex items-start gap-2.5 px-4 py-3 bg-private-tint border-b border-border-default"
  - "Lock icon (Lucide): size 16, strokeWidth 1.5, color text-text-secondary, margin-top 1px (optical alignment with first line)"
  - "Content text: text-meta text-text-secondary leading-snug"
  - "Bold prefix span: font-medium text-text-primary (e.g. 'Private to you.')"
  - "Trailing inline link: 'Learn more about privacy' opens privacy modal (Dialog component)"
  - "Lock icon is NOT a button anymore — it's decorative (aria-hidden='true'); the modal is triggered by the link, not the icon"
files:
  - path: src/components/PrivacyBanner.tsx
    role: presentational
    action: modify
    exports:
      - "PrivacyBanner — presentational component, restructured from rounded card to full-bleed banner with inline link trigger"
  - path: tests/wor-42/__snapshots__/privacy-banner-visual-style.test.tsx.snap
    role: test-infrastructure
    action: modify
    exports:
      - "Snapshot auto-updated to reflect new banner structure"
  - path: tests/wor-42/privacy-banner-visual-style.test.tsx
    role: test-infrastructure
    action: modify
    exports:
      - "Update lock-icon test: icon is now decorative (aria-hidden), not a button"
  - path: tests/wor-42/privacy-banner-modal.test.tsx
    role: test-infrastructure
    action: modify
    exports:
      - "Update modal trigger: modal now opens via 'Learn more about privacy' link, not lock icon button"
  - path: tests/wor-86/privacy-banner-full-bleed.test.tsx
    role: test-infrastructure
    action: create
    exports:
      - "Unit tests verifying full-bleed layout, decorative icon, inline text structure, and link-triggered modal"
signatures:
  - "PrivacyBanner(props: { text?: string; otherPartyName?: string }): JSX.Element"
queries_used: []
invariants:
  - "Banner is full-width — no horizontal margin (no mx-*), no rounded corners (no rounded-*)"
  - "Banner has only a bottom border (border-b border-border-default), not a full border"
  - "Lock icon is decorative: rendered as a plain SVG with aria-hidden='true', NOT wrapped in a button"
  - "Modal is triggered by an inline 'Learn more about privacy' link (anchor-styled button or <a>), not by the lock icon"
  - "Banner uses items-start alignment (not items-center) for optical alignment of icon with first text line"
  - "Typography: text-meta text-text-secondary for body; font-medium text-text-primary for 'Private to you.' prefix"
  - "All classes use design tokens — no raw Tailwind color/size literals"
non_goals:
  - "Changing the modal content (DialogContent, DialogHeader, DialogTitle, DialogDescription stay the same)"
  - "Adding new Convex queries or mutations — this is a purely presentational change"
  - "Changing how PrivacyBanner is consumed by parent components (PrivateCoachingView, ChatWindow)"
  - "Modifying the privacy modal's accessibility or behavior beyond the trigger mechanism"
tested_by:
  - ac: "Outer div: flex items-start gap-2.5 px-4 py-3 bg-private-tint border-b border-border-default"
    layer: unit
    file: tests/wor-86/privacy-banner-full-bleed.test.tsx
  - ac: "Lock icon (Lucide): size 16, strokeWidth 1.5, color text-text-secondary, margin-top 1px"
    layer: unit
    file: tests/wor-86/privacy-banner-full-bleed.test.tsx
  - ac: "Content text: text-meta text-text-secondary leading-snug"
    layer: unit
    file: tests/wor-86/privacy-banner-full-bleed.test.tsx
  - ac: "Bold prefix span: font-medium text-text-primary"
    layer: unit
    file: tests/wor-86/privacy-banner-full-bleed.test.tsx
  - ac: "Trailing inline link: 'Learn more about privacy' opens privacy modal"
    layer: unit
    file: tests/wor-86/privacy-banner-full-bleed.test.tsx
  - ac: "Lock icon is NOT a button anymore — decorative (aria-hidden='true')"
    layer: unit
    file: tests/wor-86/privacy-banner-full-bleed.test.tsx
---

# Contract: WOR-86 — PrivacyBanner: full-bleed with bottom border, not rounded card

## Why this work exists

WOR-81 over-corrected the PrivacyBanner geometry by adding rounded corners and horizontal margin, making it look like a content card. The style-guide.html §08 specifies the privacy banner as a full-bleed chrome element — a persistent header strip beneath the TopNav with only a bottom hairline border. The current card treatment visually competes with content blocks and undermines the "privacy is never implied, it is labeled" system affordance pattern.

## Files and exports

### `src/components/PrivacyBanner.tsx` (modify)

This remains a **presentational** component. The props interface changes minimally: `text` becomes optional (the banner now has hardcoded inline copy per the spec: "Private to you. Only you and the AI coach will see this."). The `otherPartyName` prop is kept for backward compat but may become unused.

Key structural changes:
1. **Outer div** — removes `mx-4 mb-2 rounded-md border` and replaces with `border-b border-border-default`. Alignment changes from `items-center` to `items-start`.
2. **Lock icon** — no longer wrapped in a `<button>`. Rendered as a bare `<Lock>` with `aria-hidden="true"` and `className="mt-px text-text-secondary shrink-0"`.
3. **Text content** — structured as: bold prefix span ("Private to you.") + body text ("Only you and the AI coach will see this.") + inline link ("Learn more about privacy").
4. **Modal trigger** — the privacy modal is now opened by clicking the "Learn more about privacy" link (a `<button>` styled as an inline text link), not the lock icon.
5. **Local state** — `useState` for `modalOpen` is preserved; the trigger just moves from icon to link.

### `tests/wor-42/__snapshots__/privacy-banner-visual-style.test.tsx.snap` (modify)

Auto-regenerated after implementation. The snapshot will reflect the new class list and DOM structure.

### `tests/wor-42/privacy-banner-visual-style.test.tsx` (modify)

The test "lock icon is not decorative (has aria-label, not aria-hidden)" must be **inverted** — the icon IS now decorative per style-guide §08. Update to assert the icon has `aria-hidden="true"` and is NOT a button.

### `tests/wor-42/privacy-banner-modal.test.tsx` (modify)

Modal trigger changes from `getByRole("button", { name: /lock/i })` to `getByRole("button", { name: /learn more/i })` or `getByText(/learn more about privacy/i)`. The modal content assertions remain valid.

### `tests/wor-86/privacy-banner-full-bleed.test.tsx` (create)

New unit tests covering all six ACs. Renders `<PrivacyBanner />` and asserts:
- Outer div classes match the full-bleed spec
- No `rounded-*`, no `mx-*` classes present
- Lock icon SVG has `aria-hidden="true"`
- No button wrapping the lock icon
- Bold prefix span with correct classes
- "Learn more about privacy" link exists and opens the modal on click

## Data dependencies

None. PrivacyBanner is a purely presentational component with no Convex queries or mutations. It receives optional props and renders static content with a local-state modal.

## Invariants

### Full-width, no card treatment

The banner outer div must NOT have `mx-4`, `rounded-md`, or full `border`. It uses only `border-b border-border-default` for a bottom hairline. This makes it read as page chrome, not a content card.

### Decorative lock icon

The lock icon is purely visual — `aria-hidden="true"`, no button wrapper, no click handler. This reverses the WOR-42 decision which was based on a misinterpretation. The interactive affordance is the "Learn more about privacy" inline link.

### Inline text with link trigger

The banner contains hardcoded copy: a bold "Private to you." prefix followed by "Only you and the AI coach will see this." and an inline "Learn more about privacy" link that opens the privacy modal. This replaces the previous pattern of passed-in `text` prop + icon-click-to-modal.

### items-start alignment

The icon and text use `items-start` (not `items-center`) so the lock icon optically aligns with the first line of multi-line text. The icon gets `mt-px` (1px top margin) for fine optical adjustment.

### Design token compliance

All classes must use design tokens: `bg-private-tint`, `border-border-default`, `text-text-secondary`, `text-text-primary`, `text-meta`. No raw Tailwind color/size literals.

## Edge cases

### Loading state

Not applicable — synchronous presentational component, renders immediately.

### Empty/missing props

The banner now has hardcoded copy so it renders correctly with no props. The `text` prop becomes optional (for backward compatibility with existing call sites that pass it, though the rendered output uses the spec's hardcoded string). The `otherPartyName` prop, if provided, is no longer displayed inline (the spec copy doesn't include it).

### Existing test breakage

The wor-42 tests for lock-icon interactivity and modal-via-icon will intentionally break. They must be updated as part of this ticket — the lock icon is no longer interactive, and the modal trigger is now the inline link.

### Multi-line text wrapping

The `items-start` alignment ensures that when the banner text wraps to multiple lines, the lock icon stays top-aligned with the first line rather than centering vertically against the full text block.

## Non-goals

- **Changing modal content** — the Dialog's title, description, and close behavior remain identical. Only the trigger mechanism changes.
- **Adding Convex queries** — this is purely presentational.
- **Changing parent component integration** — `PrivateCoachingView` and `ChatWindow` continue to render `<PrivacyBanner>` the same way. The prop interface is backward-compatible.
- **Dark mode fixes** — `bg-private-tint` already works in dark mode (fixed in PR #80). The new border/text tokens are also theme-aware.

## Test coverage

### AC: Outer div layout classes

**Layer:** unit | **File:** `tests/wor-86/privacy-banner-full-bleed.test.tsx`
Renders `<PrivacyBanner />` and asserts the outer element's className includes `flex items-start gap-2.5 px-4 py-3 bg-private-tint border-b border-border-default` and does NOT include `mx-4`, `rounded-md`, or standalone `border` (without `-b`).

### AC: Lock icon decorative

**Layer:** unit | **File:** `tests/wor-86/privacy-banner-full-bleed.test.tsx`
Asserts no button role wraps the lock icon SVG. Asserts the SVG (or its container) has `aria-hidden="true"`.

### AC: Content text typography

**Layer:** unit | **File:** `tests/wor-86/privacy-banner-full-bleed.test.tsx`
Asserts the text container has `text-meta text-text-secondary leading-snug`.

### AC: Bold prefix span

**Layer:** unit | **File:** `tests/wor-86/privacy-banner-full-bleed.test.tsx`
Asserts a span containing "Private to you" has `font-medium text-text-primary`.

### AC: Inline link opens modal

**Layer:** unit | **File:** `tests/wor-86/privacy-banner-full-bleed.test.tsx`
Clicks the "Learn more about privacy" element and asserts a dialog appears with privacy boundary content.

### AC: Lock icon is not a button

**Layer:** unit | **File:** `tests/wor-86/privacy-banner-full-bleed.test.tsx`
Asserts `queryByRole("button", { name: /lock/i })` returns null. Updated wor-42 test also validates this.

## Open questions

- **`text` prop deprecation** — The spec hardcodes the banner copy. The existing call sites pass a `text` prop. The contract keeps `text` as optional for backward compat, but the implementation should render the spec's hardcoded string regardless. If the team wants the banner to remain configurable, this contract would need revision. Decision: render hardcoded copy per spec; ignore `text` prop if passed (or use it as an override — implementer's choice as long as the default matches spec).

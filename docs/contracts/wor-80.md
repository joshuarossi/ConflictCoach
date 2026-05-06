---
task_id: WOR-80
ticket_summary: Apply DesignDoc + STYLE_GUIDE consistently across all shipped pages
ac_refs:
  - "All hardcoded color literals (bg-blue-600, text-gray-900, bg-red-50, etc.) replaced with the design tokens defined in STYLE_GUIDE / 03-DesignDoc.md (bg-accent, text-text-primary, bg-error-subtle, etc.)"
  - "All cards use the same padding/radius/shadow set from STYLE_GUIDE"
  - "Typography scale matches DesignDoc (no arbitrary text-2xl, text-lg, text-xs outside the defined scale — use the named tokens like text-h1, text-body, text-meta, text-label)"
  - "Spacing scale matches DesignDoc (no arbitrary mb-4, gap-3, py-3 outside the defined scale)"
  - "Buttons use the spec'd component variants (primary / secondary / ghost / destructive) with consistent sizing"
  - "Form inputs (text, textarea, select) use the spec'd component with consistent border/focus states"
  - "Verified pages (each must be visually consistent with the others): / (LandingPage), /login (LoginPage), /dashboard (Dashboard), /cases/:id (CaseDetail), /cases/:id/private (PrivateCoachingPage), /cases/:id/joint (JointChatPage), /cases/:id/closed (ClosedCasePage), /cases/new (NewCasePage), /invite/:token (InviteAcceptPage), /admin/templates + /admin/templates/:id (Admin Templates), /admin/audit (Admin Audit Log), /forbidden (Forbidden)"
  - "All pages render correctly under both reading-width (720px) and chat-width (1080px) layouts per WOR-30 conventions"
  - "Per-page screenshot saved to docs/visual-pass/<page>.png for reference (Playwright screenshot is fine)"
files:
  # --- Layout / shared components (highest leverage — used everywhere) ---
  - path: src/components/layout/AppLayout.tsx
    role: connected
    action: modify
    exports:
      - "ReadingLayout, ChatLayout — replace bg-gray-50 with bg-canvas"
  - path: src/components/layout/TopNav.tsx
    role: connected
    action: modify
    exports:
      - "TopNav — replace all hardcoded gray/blue Tailwind classes with design tokens"
  - path: src/components/layout/AuthGuard.tsx
    role: connected
    action: modify
    exports:
      - "AuthGuard — replace bg-gray-50 and text-gray-500 with bg-canvas and text-tertiary"
  - path: src/components/layout/AdminGuard.tsx
    role: connected
    action: modify
    exports:
      - "AdminGuard — replace bg-gray-50 and text-gray-500 with bg-canvas and text-tertiary"
  - path: src/components/layout/Forbidden.tsx
    role: presentational
    action: modify
    exports:
      - "Forbidden — replace text-4xl/text-lg/text-gray-* with text-h1/text-h3/text-primary/text-secondary"
  - path: src/components/layout/ConvexErrorBoundary.tsx
    role: presentational
    action: modify
    exports:
      - "ConvexErrorBoundary — replace text-4xl/text-lg with text-h1/text-h3 and gray colors with tokens"
  # --- UI primitives (shadcn/ui overrides) ---
  - path: src/components/ui/button.tsx
    role: presentational
    action: modify
    exports:
      - "Button, buttonVariants — replace shadow-sm with shadow-1; replace text-xs/text-sm with text-meta/text-label; ensure variant colors use tokens"
  - path: src/components/ui/dialog.tsx
    role: presentational
    action: modify
    exports:
      - "Dialog* — replace bg-black/80 with semantic overlay, bg-white with bg-surface, shadow-lg with shadow-3, text-lg with text-h3, text-sm with text-label"
  - path: src/components/ui/alert-dialog.tsx
    role: presentational
    action: modify
    exports:
      - "AlertDialog* — same replacements as dialog.tsx"
  - path: src/components/ui/tabs.tsx
    role: presentational
    action: modify
    exports:
      - "Tabs* — replace shadow-sm with shadow-1, text-sm with text-label"
  # --- Feature components ---
  - path: src/components/SignIn.tsx
    role: connected
    action: modify
    exports:
      - "SignIn — replace bg-gray-50/bg-white/bg-blue-600/text-white with bg-canvas/bg-surface/bg-accent/text-accent-on; replace text-2xl/text-sm/text-xs with text-h1/text-label/text-meta; replace shadow-sm with shadow-1"
  - path: src/components/SoloBanner.tsx
    role: presentational
    action: modify
    exports:
      - "SoloBanner — replace bg-amber-50/border-amber-200/text-amber-800 with bg-warning-subtle/border-warning/text-warning; replace text-sm with text-label"
  - path: src/components/PartyToggle.tsx
    role: presentational
    action: modify
    exports:
      - "PartyToggle — replace bg-white/hover:bg-gray-50 with bg-surface/hover:bg-surface-subtle; replace text-sm with text-label"
  - path: src/components/MessageBubble.tsx
    role: presentational
    action: modify
    exports:
      - "MessageBubble — replace text-xs with text-timestamp; replace text-white with text-accent-on where applicable"
  - path: src/components/DraftReadyCard.tsx
    role: presentational
    action: modify
    exports:
      - "DraftReadyCard — replace text-sm with text-label; normalize bg-[var(--*)] to Tailwind utility classes"
  - path: src/components/DraftCoachPanel.tsx
    role: connected
    action: modify
    exports:
      - "DraftCoachPanel — replace text-sm/text-xs with text-label/text-meta"
  - path: src/components/CaseClosureModal.tsx
    role: connected
    action: modify
    exports:
      - "CaseClosureModal — replace text-sm with text-label"
  - path: src/components/ReadyForJointView.tsx
    role: connected
    action: modify
    exports:
      - "ReadyForJointView — replace text-sm with text-label"
  # --- Page components ---
  - path: src/pages/LandingPage.tsx
    role: connected
    action: modify
    exports:
      - "LandingPage — audit and replace any hardcoded Tailwind classes with design tokens"
  - path: src/pages/LoginPage.tsx
    role: connected
    action: modify
    exports:
      - "LoginPage — verify token usage (minimal file, may already be clean)"
  - path: src/pages/Dashboard.tsx
    role: connected
    action: modify
    exports:
      - "Dashboard — audit and replace any hardcoded Tailwind classes with design tokens"
  - path: src/pages/CaseDetail.tsx
    role: connected
    action: modify
    exports:
      - "CaseDetail — replace bg-white/border-gray-200/text-gray-*/bg-blue-600/shadow-sm/text-4xl/text-2xl/text-xl/text-lg/text-sm with token equivalents"
  - path: src/pages/InviteAcceptPage.tsx
    role: connected
    action: modify
    exports:
      - "InviteAcceptPage — replace bg-white/bg-gray-50/text-gray-*/bg-blue-600/shadow-sm/text-2xl/text-sm with token equivalents"
  - path: src/pages/InviteSharingPage.tsx
    role: connected
    action: modify
    exports:
      - "InviteSharingPage — audit and replace any hardcoded Tailwind classes"
  - path: src/pages/NewCasePage.tsx
    role: connected
    action: modify
    exports:
      - "NewCasePage — audit and replace any hardcoded Tailwind classes"
  - path: src/pages/ClosedCasePage.tsx
    role: connected
    action: modify
    exports:
      - "ClosedCasePage — audit and replace any hardcoded Tailwind classes"
  - path: src/pages/PrivateCoachingPage.tsx
    role: connected
    action: modify
    exports:
      - "PrivateCoachingPage — audit (likely a thin wrapper, may already be clean)"
  - path: src/pages/JointChatPage.tsx
    role: connected
    action: modify
    exports:
      - "JointChatPage — audit (likely a thin wrapper, may already be clean)"
  - path: src/pages/ReadyForJointPage.tsx
    role: connected
    action: modify
    exports:
      - "ReadyForJointPage — audit (likely a thin wrapper, may already be clean)"
  - path: src/pages/admin/TemplatesListPage.tsx
    role: connected
    action: modify
    exports:
      - "TemplatesListPage — replace border-gray-*/bg-white/hover:bg-gray-50/text-sm with token equivalents"
  - path: src/pages/admin/TemplateEditPage.tsx
    role: connected
    action: modify
    exports:
      - "TemplateEditPage — replace border-gray-300/bg-white/bg-gray-50/text-sm with token equivalents"
  - path: src/pages/admin/AuditLogPage.tsx
    role: connected
    action: modify
    exports:
      - "AuditLogPage — replace bg-black/30 and any other hardcoded classes with token equivalents"
  # --- E2E screenshot infrastructure ---
  - path: e2e/wor-80/visual-pass.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "Playwright test that navigates each verified page and captures a screenshot to docs/visual-pass/<page>.png"
  - path: tests/wor-80/token-usage.test.ts
    role: test-infrastructure
    action: create
    exports:
      - "Unit test that greps page source files for hardcoded color/size/spacing literals not in the design token allowlist"
  - path: tests/wor-80/layout-width.test.ts
    role: test-infrastructure
    action: create
    exports:
      - "Unit test that verifies each page renders inside the correct layout (reading vs chat width) per App.tsx route definitions"
signatures:
  - "No new public APIs. All changes are Tailwind class replacements within existing components."
queries_used: []
invariants:
  - "No hardcoded Tailwind color classes (bg-blue-*, text-gray-*, bg-white, bg-black, border-gray-*, etc.) remain in any .tsx file under src/"
  - "No hardcoded Tailwind shadow classes (shadow-sm, shadow-md, shadow-lg) remain — only shadow-0, shadow-1, shadow-2, shadow-3"
  - "No hardcoded Tailwind text size classes (text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl, text-4xl) remain — only text-display, text-h1, text-h2, text-h3, text-body, text-chat, text-label, text-meta, text-timestamp"
  - "Spacing uses the 8px grid: 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px)"
  - "All cards use consistent padding (p-4 to p-6), radius (rounded-lg = 14px), and shadow (shadow-1)"
  - "Buttons use only the spec'd variants: primary (bg-accent text-accent-on), secondary, ghost, danger"
  - "Form inputs use border-border-strong default, border-accent + accent-subtle ring on focus"
  - "No behavioral changes — this is purely a styling consistency pass"
  - "No new components or features"
  - "Arbitrary CSS var bracket syntax (bg-[var(--*)]) replaced with the equivalent Tailwind utility class (bg-surface, bg-canvas, etc.) wherever the token is mapped in index.css @theme"
non_goals:
  - "Behavioral changes to any page or component"
  - "New components or features"
  - "Animations beyond what's in DesignDoc"
  - "Dark mode implementation (already wired via CSS vars; this ticket just ensures token usage so dark mode works automatically)"
  - "Component library swap (keep shadcn/ui where it's already wired)"
  - "Changing layout structure or route definitions"
  - "Modifying Convex queries, mutations, or actions"
tested_by:
  - ac: "All hardcoded color literals replaced with design tokens"
    layer: unit
    file: tests/wor-80/token-usage.test.ts
    reason: ""
  - ac: "All cards use the same padding/radius/shadow set from STYLE_GUIDE"
    layer: unit
    file: tests/wor-80/token-usage.test.ts
    reason: ""
  - ac: "Typography scale matches DesignDoc"
    layer: unit
    file: tests/wor-80/token-usage.test.ts
    reason: ""
  - ac: "Spacing scale matches DesignDoc"
    layer: unit
    file: tests/wor-80/token-usage.test.ts
    reason: ""
  - ac: "Buttons use the spec'd component variants"
    layer: unit
    file: tests/wor-80/token-usage.test.ts
    reason: ""
  - ac: "Form inputs use the spec'd component with consistent border/focus states"
    layer: unit
    file: tests/wor-80/token-usage.test.ts
    reason: ""
  - ac: "Verified pages are visually consistent"
    layer: e2e
    file: e2e/wor-80/visual-pass.spec.ts
    reason: "Visual consistency requires rendering each page in a real browser; unit tests can only verify class strings"
  - ac: "All pages render correctly under both reading-width (720px) and chat-width (1080px) layouts"
    layer: unit
    file: tests/wor-80/layout-width.test.ts
    reason: ""
  - ac: "Per-page screenshot saved to docs/visual-pass/<page>.png"
    layer: e2e
    file: e2e/wor-80/visual-pass.spec.ts
    reason: "Screenshots require a real browser via Playwright"
---

# Contract: WOR-80 — Apply DesignDoc + STYLE_GUIDE consistently across all shipped pages

## Why this work exists

Pages were built by independent tickets (WOR-31, 32, 34, 49, 57, 62, 67), each styling itself with arbitrary Tailwind. The result is inconsistent: different blue shades for the same primary action, different card paddings, different heading sizes, different page widths. Design tokens shipped in WOR-24 and a comprehensive STYLE_GUIDE exist but are not applied uniformly. This ticket is a consistency pass, not a redesign — if the DesignDoc disagrees with what currently ships, follow the DesignDoc.

## Files and exports

This ticket modifies **33 existing files** and creates **3 test files**. No new application files are created.

### Layout components (highest leverage)

- **`src/components/layout/AppLayout.tsx`** — provides ReadingLayout (720px) and ChatLayout (1080px). Currently uses `bg-gray-50` which must become `bg-canvas`.
- **`src/components/layout/TopNav.tsx`** — the most violation-dense layout file. Uses ~15 hardcoded gray/blue Tailwind classes for text, backgrounds, and hover states. All must be replaced with semantic tokens (`text-secondary`, `bg-surface-subtle`, `text-accent`, etc.).
- **`src/components/layout/AuthGuard.tsx`** and **`AdminGuard.tsx`** — loading/forbidden states use `bg-gray-50` and `text-gray-500`.
- **`src/components/layout/Forbidden.tsx`** — uses `text-4xl` and `text-lg` (should be `text-h1` and `text-h3`), plus gray color literals.
- **`src/components/layout/ConvexErrorBoundary.tsx`** — same text-size and color violations as Forbidden.

### UI primitives (shadcn/ui)

- **`src/components/ui/button.tsx`** — uses `shadow-sm` (should be `shadow-1`) and `text-xs`/`text-sm` (should be `text-meta`/`text-label`). Button variants must align with STYLE_GUIDE §6.1: primary (sage fill), secondary, ghost, danger, link. Heights: sm 32px, md 40px, lg 48px.
- **`src/components/ui/dialog.tsx`** — uses `bg-black/80` for overlay (should use a design-token-friendly overlay), `bg-white` (should be `bg-surface`), `shadow-lg` (should be `shadow-3`), `text-lg`/`text-sm` (should be `text-h3`/`text-label`).
- **`src/components/ui/alert-dialog.tsx`** — same issues as dialog.tsx.
- **`src/components/ui/tabs.tsx`** — uses `shadow-sm` (should be `shadow-1`) and `text-sm` (should be `text-label`).

### Feature components

- **`src/components/SignIn.tsx`** — heavy violations: `bg-gray-50`, `bg-white`, `bg-blue-600 text-white hover:bg-blue-700`, `shadow-sm`, `text-2xl`, `text-sm`, `text-xs`. This is the login form and must match DesignDoc §4.2 precisely.
- **`src/components/SoloBanner.tsx`** — uses `bg-amber-50 border-amber-200 text-amber-800` (should be `bg-warning-subtle border-warning text-warning`).
- **`src/components/PartyToggle.tsx`** — mixed approach with `bg-white` alongside `text-[var(--coach-accent)]`. Should use `bg-surface` and `text-coach-accent`.
- **`src/components/MessageBubble.tsx`** — uses `text-xs` for timestamps (should be `text-timestamp`) and `text-white` in some contexts.
- **`src/components/DraftReadyCard.tsx`** — uses `text-sm` and arbitrary `bg-[var(--*)]` bracket syntax that should use the mapped Tailwind utilities.
- **`src/components/DraftCoachPanel.tsx`** — uses `text-sm`/`text-xs` (should be `text-label`/`text-meta`).
- **`src/components/CaseClosureModal.tsx`** — uses `text-sm` throughout (should be `text-label`).
- **`src/components/ReadyForJointView.tsx`** — uses `text-sm` (should be `text-label`).

### Page components

- **`src/pages/CaseDetail.tsx`** (203 lines) — the most violation-dense page: `border-gray-200 bg-white`, `text-gray-900`, `text-gray-600`, `text-blue-600 hover:text-blue-800`, `bg-blue-600 text-white hover:bg-blue-700`, `shadow-sm`, `text-4xl`, `text-2xl`, `text-xl`, `text-lg`, `text-sm`.
- **`src/pages/InviteAcceptPage.tsx`** (184 lines) — similar violations: `bg-white`, `bg-gray-50`, `text-gray-*`, `bg-blue-600`, `shadow-sm`, `text-2xl`, `text-sm`.
- **`src/pages/admin/TemplatesListPage.tsx`**, **`TemplateEditPage.tsx`**, **`AuditLogPage.tsx`** — admin pages with `border-gray-*`, `bg-white`, `hover:bg-gray-50`, `text-sm` violations.
- **`src/pages/LandingPage.tsx`**, **`Dashboard.tsx`**, **`ClosedCasePage.tsx`**, **`InviteSharingPage.tsx`**, **`NewCasePage.tsx`** — need auditing for any remaining violations. Some of these (Dashboard, ClosedCasePage) already use tokens in many places but may have inconsistencies.
- **`src/pages/PrivateCoachingPage.tsx`**, **`JointChatPage.tsx`**, **`ReadyForJointPage.tsx`**, **`LoginPage.tsx`** — thin wrappers (~10 lines each), likely already clean but must be verified.

## Data dependencies

No Convex queries or mutations are called by this work. This is a purely presentational change — no data layer modifications.

## Invariants

### No hardcoded color literals
After this work, `grep -rE 'bg-(blue|red|green|gray|white|black|amber|slate|zinc|neutral|stone)-' src/` must return zero matches (excluding CSS var definitions in globals.css/index.css). The only acceptable color classes are the design-token-mapped ones: `bg-canvas`, `bg-surface`, `bg-surface-subtle`, `bg-accent`, `bg-accent-hover`, `bg-accent-subtle`, `bg-danger`, `bg-danger-subtle`, `bg-warning`, `bg-warning-subtle`, `bg-coach-subtle`, `bg-private-tint`, `bg-party-initiator-subtle`, `bg-party-invitee-subtle`, plus opacity modifiers on these tokens.

### No hardcoded shadows
Only `shadow-0`, `shadow-1`, `shadow-2`, `shadow-3` are allowed. No `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`.

### No hardcoded text sizes
Only the named scale is allowed: `text-display`, `text-h1`, `text-h2`, `text-h3`, `text-body`, `text-chat`, `text-label`, `text-meta`, `text-timestamp`. No `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`.

### No arbitrary CSS var bracket syntax where a token exists
`bg-[var(--bg-surface)]` must become `bg-surface`. The bracket syntax is only acceptable for tokens not yet mapped in the `@theme` block of `index.css`.

### Spacing grid
All spacing values must come from the 8px grid (Tailwind values: 1, 2, 3, 4, 5, 6, 8, 10, 12, 16). Odd Tailwind spacing values like `p-7`, `gap-9`, `m-11` are not allowed.

### No behavioral changes
Component props, hook return values, route definitions, event handlers, and Convex function calls must remain unchanged. Only `className` strings are modified.

## Edge cases

### Loading states
Loading spinners and skeleton screens in AuthGuard, AdminGuard, and other loading states must use `bg-canvas` for background and `text-tertiary` for loading text. The `skeleton.tsx` component should use `bg-surface-subtle` for its shimmer.

### Empty states
Dashboard empty state ("No cases yet") and any other empty states must use `text-secondary` for the message and `bg-canvas` for the background.

### Error states
ConvexErrorBoundary and inline error messages must use `text-danger` for error text and `bg-danger-subtle` for error backgrounds. The Forbidden page uses `text-primary` for the 403 code and `text-secondary` for the description.

### Overlay backgrounds
Dialog and AlertDialog overlays currently use `bg-black/80`. This should remain a dark overlay but can be kept as `bg-black/80` since no semantic overlay token exists in the design system. This is an acceptable exception since overlays are not part of the themed surface hierarchy. Alternatively, a CSS var `--overlay` could be introduced, but that is out of scope for this ticket.

### Font weight
STYLE_GUIDE §3.2 says **never use 700 (bold)**. Headings use `font-medium` (500). Any `font-bold` or `font-semibold` on headings must be replaced with `font-medium`. `font-bold` is acceptable only on non-heading emphasis text within body copy.

## Non-goals

- **Behavioral changes** — no props, hooks, state, or event handling changes.
- **New components or features** — no new UI components. This is a find-and-replace consistency pass.
- **Animations** — do not add or modify animations. Only change class names.
- **Dark mode** — dark mode is already wired via CSS custom properties in globals.css. Using tokens ensures dark mode works automatically. No dark-mode-specific work is needed.
- **Component library swap** — keep shadcn/ui primitives; just update their class names.
- **Layout structure** — do not change the ReadingLayout/ChatLayout split or route definitions.
- **Convex backend** — zero backend changes.

## Test coverage

### AC: Hardcoded color/shadow/typography literals replaced
**Layer:** unit | **File:** `tests/wor-80/token-usage.test.ts`
This test reads every `.tsx` file under `src/` and checks that no hardcoded Tailwind color classes, shadow classes, or text-size classes appear. It maintains an allowlist of design-token-mapped classes and a denylist of raw Tailwind classes. Any file containing a denied class fails the test with a message identifying the file and the offending class.

### AC: Cards, buttons, inputs use consistent spec'd styles
**Layer:** unit | **File:** `tests/wor-80/token-usage.test.ts`
Covered by the same denylist approach — if a button uses `bg-blue-600` instead of `bg-accent`, the test catches it.

### AC: Spacing scale matches DesignDoc
**Layer:** unit | **File:** `tests/wor-80/token-usage.test.ts`
The test checks for spacing values outside the 8px grid (p-7, gap-9, m-11, etc.).

### AC: All pages render correctly under both layout widths
**Layer:** unit | **File:** `tests/wor-80/layout-width.test.ts`
This test imports the App route definitions and verifies that each page component is nested under the correct layout (ReadingLayout or ChatLayout) per the DesignDoc §2.3 spec.

### AC: Verified pages are visually consistent + screenshots saved
**Layer:** e2e | **File:** `e2e/wor-80/visual-pass.spec.ts`
Playwright navigates to each verified page (with appropriate auth and test data), captures a screenshot, and saves it to `docs/visual-pass/<page>.png`. The test asserts that the screenshot file exists and is non-empty. No pixel-diff comparison — the ticket explicitly says snapshot diffs are too brittle; existence of the screenshot is sufficient.

## Open questions

1. **Overlay color for dialogs:** The current `bg-black/80` is not a design token. The STYLE_GUIDE specifies `rgba(0,0,0,.3)` + 2px backdrop blur for modals (§6.12). The implementation should use `bg-black/30 backdrop-blur-sm` per the STYLE_GUIDE, which is a visual change from the current `bg-black/80`. This contract adopts the STYLE_GUIDE value since the ticket says "if the DesignDoc disagrees with what currently ships, follow the DesignDoc."

2. **`font-bold` vs `font-medium` on headings:** The STYLE_GUIDE says headings use weight 500 (medium), never 700. Some pages use `font-bold` on headings. This contract treats `font-bold` on headings as a violation to fix, but `font-bold` on non-heading text (e.g., `<strong>` within body copy) is acceptable.

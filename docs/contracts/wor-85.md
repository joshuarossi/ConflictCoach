---
task_id: WOR-85
ticket_summary: "TopNav: Dashboard link missing as a distinct nav item (DesignDoc \xA73.2)"
ac_refs:
  - "The TopNav case-less mode renders three distinct elements: branding (left), nav cluster (right), user menu (right-most)"
  - "\"Dashboard\" appears as an explicit nav link in the right-side cluster"
  - "Active route is visually indicated when the user is on /dashboard (bold text, primary text color, or subtle background)"
  - "Branding is still clickable (back-compat) but visually styled as a wordmark, not as a primary nav link"
files:
  - path: src/components/layout/TopNav.tsx
    role: connected
    action: modify
    exports:
      - "TopNav — restructure the dashboard/non-case branch to render branding (left) + nav cluster with Dashboard link + UserMenu (right)"
      - "TopNavProps — unchanged interface ({ children?: ReactNode })"
      - "UserMenu — internal component, unchanged"
  - path: tests/wor-85/topnav-dashboard-link.test.tsx
    role: test-infrastructure
    action: create
    exports:
      - "Unit tests verifying dashboard-mode TopNav renders branding, Dashboard link, and UserMenu as three distinct elements with correct styling"
  - path: e2e/wor-85/topnav-dashboard-link.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "E2E test verifying the Dashboard link is visible and the active route indicator is applied on /dashboard"
signatures:
  - "TopNav(props: { children?: ReactNode }): JSX.Element — signature unchanged"
  - "TopNavProps = { children?: ReactNode } — unchanged"
queries_used:
  - "api.users.me — called by UserMenu to display user name/avatar (read-only, existing)"
  - "api.cases.get — called in case-route mode only; not relevant to this ticket's changes"
invariants:
  - "In dashboard/non-case mode, the nav element contains three visually distinct regions: (1) branding on the left, (2) a nav-cluster with a 'Dashboard' link on the right, (3) UserMenu on the far right"
  - "The 'Dashboard' nav link is a <Link to=\"/dashboard\"> (or <NavLink>) rendered as a separate DOM element from the branding wordmark"
  - "The branding wordmark ('Conflict Coach') remains a clickable <Link to=\"/dashboard\"> for back-compat, but is styled as text-h3 font-medium text-text-primary with NO hover:bg-surface-subtle (it's a logo, not a nav button)"
  - "Nav cluster links (including 'Dashboard') use: text-label text-text-secondary px-3 py-1.5 rounded-md hover:bg-surface-subtle hover:text-text-primary"
  - "Active route indicator: when on /dashboard, the Dashboard link gets text-text-primary (elevated from text-text-secondary) — no separate pill or background, just typography weight"
  - "Nav cluster items are separated by gap-1; the cluster is separated from UserMenu by gap-4"
  - "All classes use design tokens — no raw Tailwind color/size literals"
  - "Case-route mode (isCaseRoute branch) is NOT modified by this ticket"
non_goals:
  - "Modifying the case-route (isCaseRoute) branch of TopNav"
  - "Adding the Admin dropdown menu (separate ticket)"
  - "Adding the Profile menu (separate ticket)"
  - "Changing UserMenu behavior or styling"
  - "Adding new design tokens — all needed tokens already exist"
  - "Changing TopNavProps or the component's public interface"
tested_by:
  - ac: "The TopNav case-less mode renders three distinct elements: branding (left), nav cluster (right), user menu (right-most)"
    layer: unit
    file: tests/wor-85/topnav-dashboard-link.test.tsx
  - ac: "\"Dashboard\" appears as an explicit nav link in the right-side cluster"
    layer: unit
    file: tests/wor-85/topnav-dashboard-link.test.tsx
  - ac: "Active route is visually indicated when the user is on /dashboard"
    layer: both
    file: tests/wor-85/topnav-dashboard-link.test.tsx
    reason: "Unit test checks the class is present; e2e confirms visual indicator renders in a real browser on the /dashboard route"
  - ac: "Branding is still clickable (back-compat) but visually styled as a wordmark, not as a primary nav link"
    layer: unit
    file: tests/wor-85/topnav-dashboard-link.test.tsx
---

# Contract: WOR-85 — TopNav: Dashboard link missing as a distinct nav item

## Why this work exists

DesignDoc section 3.2 specifies the case-less TopNav with three distinct elements: branding on the left, a "Dashboard" nav link on the right, and the user menu on the far right. The current implementation conflates branding with navigation — "Conflict Coach" is the only clickable element and it doubles as both the logo and the dashboard link. This confuses users who don't expect the brand-mark to be the primary navigation, and it won't scale when the Admin and Profile menu items are added to the right-side cluster by sibling tickets.

## Files and exports

### `src/components/layout/TopNav.tsx` (modify)

The dashboard/non-case branch (lines 165-177 currently) is restructured. The existing `<Link to="/dashboard">Conflict Coach</Link>` is restyled as a pure wordmark (text-h3 font-medium text-text-primary, no hover background). A new nav cluster `<div>` is added to the right side, containing a "Dashboard" `<Link>` (or `<NavLink>`) styled as a nav item (text-label text-text-secondary px-3 py-1.5 rounded-md hover:bg-surface-subtle). The UserMenu follows the nav cluster, separated by gap-4.

The component remains connected — it calls `useQuery`, `useParams`, `useLocation` internally. Its public interface (`TopNavProps`) does not change. `AppLayout` continues to render `<TopNav>` the same way.

The active-route detection uses `useLocation()` (already imported) to check if `location.pathname` starts with `/dashboard`, applying `text-text-primary` to the Dashboard link when active.

### `tests/wor-85/topnav-dashboard-link.test.tsx` (create)

Unit tests using vitest + @testing-library/react + MemoryRouter, following the pattern established in `tests/wor-67/topnav-case-context.test.tsx`. Mocks `convex/react` and `@convex-dev/auth/react`. Renders `<TopNav />` inside a `<MemoryRouter initialEntries={["/dashboard"]}>` and asserts DOM structure and class names.

### `e2e/wor-85/topnav-dashboard-link.spec.ts` (create)

Playwright e2e test that navigates to /dashboard as an authenticated user and verifies: (1) the "Dashboard" link text is visible, (2) the link has the active-route styling, (3) the branding text "Conflict Coach" is present.

## Data dependencies

- **`api.users.me`** — returns user profile with `displayName` and `email`. Used by `UserMenu` to render the avatar initial and display name. No changes to this query or how it's consumed.
- **`api.cases.get`** — only called in case-route mode (when `params.caseId` is truthy). This ticket does not touch the case-route branch, so this query is irrelevant to the change.

## Invariants

**Three distinct DOM regions in dashboard mode.** The `<nav>` must contain: (1) a branding element on the left with text "Conflict Coach", (2) a nav-cluster container on the right holding a "Dashboard" link, (3) the UserMenu button. These must be separate DOM elements, not a single link serving double duty.

**Branding is a wordmark, not a nav button.** The "Conflict Coach" text uses `text-h3 font-medium text-text-primary`. It does NOT get `hover:bg-surface-subtle` — it's a logo. It remains a `<Link to="/dashboard">` for back-compat (users who click the logo still get to the dashboard), but its visual role is branding.

**Nav links share a consistent visual style.** The "Dashboard" link (and future Admin/Profile links added by sibling tickets) uses `text-label text-text-secondary px-3 py-1.5 rounded-md hover:bg-surface-subtle hover:text-text-primary`. This ensures the right-side cluster coheres visually.

**Active route indication is typographic only.** When on `/dashboard`, the Dashboard link class changes from `text-text-secondary` to `text-text-primary`. No background pill, no border — just elevated text color. This matches the style guidance in the ticket.

**Design tokens only.** No raw Tailwind color, typography, or spacing classes. Enforced by `tests/wor-80/token-usage.test.ts`.

**Case-route branch untouched.** The `if (isCaseRoute)` branch (lines 131-161) is not modified. This ticket only changes the else branch (dashboard/non-case mode).

## Edge cases

**Loading state.** `UserMenu` already handles `user` being `undefined` (shows "Account" fallback and "?" avatar). No new loading states are introduced — the Dashboard link is static text, not data-dependent.

**Children slot.** `TopNav` accepts `children` (used by `AppLayout` to inject `PartyToggle` in case routes). In dashboard mode, `children` are rendered between the nav cluster and UserMenu. This behavior is preserved; the children slot moves into the right-side flex container.

**Non-dashboard routes.** On routes like `/cases/:caseId`, the isCaseRoute branch renders instead, so the new dashboard-mode layout is invisible. On other non-case routes (if any), the Dashboard link should still render but without the active indicator.

## Non-goals

- **Admin dropdown menu** — separate ticket. The nav cluster is designed with `gap-1` so future items slot in naturally, but this ticket does not add the Admin link.
- **Profile menu** — separate ticket.
- **Changing UserMenu** — styling and behavior are unchanged.
- **Modifying case-route TopNav** — the `isCaseRoute` branch is untouched.
- **Adding new design tokens** — all needed tokens (`text-h3`, `text-label`, `text-text-primary`, `text-text-secondary`, `bg-surface-subtle`, `hover:bg-surface-subtle`, `hover:text-text-primary`) already exist.

## Test coverage

| AC | Layer | File | Reason |
|----|-------|------|--------|
| Three distinct elements: branding, nav cluster, user menu | unit | `tests/wor-85/topnav-dashboard-link.test.tsx` | DOM structure can be asserted via @testing-library queries |
| "Dashboard" appears as explicit nav link | unit | `tests/wor-85/topnav-dashboard-link.test.tsx` | Check for a link element with text "Dashboard" and href="/dashboard" |
| Active route visually indicated on /dashboard | both | `tests/wor-85/topnav-dashboard-link.test.tsx` + `e2e/wor-85/topnav-dashboard-link.spec.ts` | Unit checks class; e2e confirms visual rendering in browser |
| Branding clickable but styled as wordmark | unit | `tests/wor-85/topnav-dashboard-link.test.tsx` | Check branding link exists, has wordmark classes, lacks nav-button hover classes |

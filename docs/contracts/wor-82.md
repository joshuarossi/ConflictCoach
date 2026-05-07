---
task_id: WOR-82
ticket_summary: "TopNav: no admin entry point for ADMIN users"
ac_refs:
  - "When the logged-in user has role ADMIN, the TopNav (in case-less mode) shows an Admin link or menu pointing to /admin/templates and /admin/audit"
  - "Non-admin users see no such link"
  - "The Admin entry matches existing TopNav link styling (text-label, text-text-secondary, hover:bg-surface-subtle)"
  - "The user.role check uses server-side trusted data from useQuery(api.users.me)"
  - "Focus state uses focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
files:
  - path: src/components/layout/TopNav.tsx
    role: connected
    action: modify
    exports:
      - "TopNav — add AdminMenu dropdown visible only when user.role === 'ADMIN', rendered in the dashboard/non-case nav bar"
      - "AdminMenu — internal component (not exported); dropdown with Templates and Audit Log links"
  - path: tests/wor-82/admin-topnav.test.tsx
    role: test-infrastructure
    action: create
    exports:
      - "Unit tests verifying AdminMenu visibility based on user role, dropdown links, and styling"
  - path: e2e/wor-82/admin-topnav.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "E2E test verifying admin link appears for ADMIN users and is absent for USER users"
signatures:
  - "TopNav(props: TopNavProps): JSX.Element — signature unchanged; AdminMenu is rendered internally based on useQuery(api.users.me) result"
  - "AdminMenu(): JSX.Element — internal component, no props; reads user from the same useQuery(api.users.me) call already in TopNav's render tree (via UserMenu); manages its own open/close state"
queries_used:
  - "api.users.me — returns UserRecord { _id, email, displayName?, role: 'USER' | 'ADMIN', createdAt }; the role field gates AdminMenu visibility"
invariants:
  - "AdminMenu is only rendered when user?.role === 'ADMIN' — the role value comes from useQuery(api.users.me), which is server-side trusted (requireAuth resolves the user record from the DB)"
  - "AdminMenu is only rendered in the non-case (dashboard) TopNav, not in the inside-case nav bar"
  - "Non-admin users (role === 'USER') never see the Admin link or dropdown — the DOM element must not exist, not just be hidden"
  - "All classes use design tokens — no raw Tailwind color/size literals"
  - "Focus states use focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
  - "The AdminMenu dropdown links navigate to /admin/templates and /admin/audit"
non_goals:
  - "Modifying the admin pages themselves (TemplatesListPage, TemplateEditPage, AuditLogPage)"
  - "Changing the AdminGuard route protection — it already works correctly"
  - "Adding admin links to the inside-case TopNav — admin nav is only relevant in dashboard/case-less mode"
  - "Adding admin functionality beyond navigation links (no inline admin controls in the TopNav)"
tested_by:
  - ac: "When the logged-in user has role ADMIN, the TopNav shows an Admin menu"
    layer: both
    file: tests/wor-82/admin-topnav.test.tsx
  - ac: "Non-admin users see no Admin link"
    layer: both
    file: tests/wor-82/admin-topnav.test.tsx
  - ac: "The Admin entry matches existing TopNav link styling"
    layer: unit
    file: tests/wor-82/admin-topnav.test.tsx
  - ac: "The user.role check uses server-side trusted data"
    layer: unit
    file: tests/wor-82/admin-topnav.test.tsx
  - ac: "Focus state uses focus-visible outline tokens"
    layer: unit
    file: tests/wor-82/admin-topnav.test.tsx
  - ac: "Dropdown links navigate to /admin/templates and /admin/audit"
    layer: both
    file: tests/wor-82/admin-topnav.test.tsx
    reason: "Unit test verifies link hrefs; e2e test verifies actual navigation works"
---

# Contract: WOR-82 — TopNav: no admin entry point for ADMIN users

## Why this work exists

Admin users currently have no way to reach /admin/templates or /admin/audit
from the application chrome — they must type URLs manually. The DesignDoc
(§3.1, §3.2) lists admin routes as first-class sections of the logged-in
app, but the TopNav only renders the logo link and UserMenu. This ticket
adds a role-gated Admin dropdown to the non-case TopNav so ADMIN users can
navigate to admin pages without guessing URLs.

## Files and exports

### `src/components/layout/TopNav.tsx` (modify)

This is a **connected** component — it already calls `useQuery(api.users.me)`
internally (via the `UserMenu` sub-component) and `useQuery(api.cases.get)`
for case context. The admin menu is added as an internal `AdminMenu`
component rendered in the dashboard/non-case branch of TopNav, positioned
to the left of `UserMenu` in the `flex items-center gap-4` container.

`AdminMenu` is **not exported** — it is an implementation detail of TopNav.
It follows the same pattern as `UserMenu`: an internal function component
with its own `useState` for open/close, a `useRef` for click-outside
dismissal, and a `useEffect` for the click-outside listener. It calls
`useQuery(api.users.me)` to get the user record and conditionally renders
based on `user?.role === "ADMIN"`.

The trigger button renders an icon (Lucide `ShieldAlert` or `Settings`) and
the text "Admin" with a chevron indicator, styled identically to UserMenu's
trigger: `text-label text-text-secondary hover:bg-surface-subtle rounded-md
px-3 py-1.5`. The focus state is
`focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`.

The dropdown panel matches UserMenu's dropdown styling: `absolute right-0
top-full z-10 mt-1 w-48 rounded-md border bg-surface py-1 shadow-3`. It
contains two menu items:

1. **Templates** — `<Link to="/admin/templates">` with text "Templates"
2. **Audit Log** — `<Link to="/admin/audit">` with text "Audit Log"

Each menu item uses the same styling as UserMenu's items: `block w-full
px-3 py-2 text-left text-label text-text-secondary hover:bg-surface-subtle`.

When `user?.role !== "ADMIN"` (including when user is `undefined` or `null`),
`AdminMenu` returns `null` — no DOM elements are rendered.

The component is placed in the non-case nav's button row:

```
<div className="flex items-center gap-4">
  {children}
  <AdminMenu />   {/* NEW */}
  <UserMenu />
</div>
```

### `tests/wor-82/admin-topnav.test.tsx` (create)

Unit tests using the same `convex-mocks` infrastructure as `tests/wor-30/`.
Tests render `<AppRoutes />` inside a `<MemoryRouter>` at `/dashboard` with
the mock user set to either `{ role: "ADMIN", displayName: "Admin" }` or
`{ role: "USER", displayName: "Regular" }`.

### `e2e/wor-82/admin-topnav.spec.ts` (create)

E2E tests using the `createTestAdminUser` / `createTestUser` / `loginAsUser`
fixtures from `e2e/fixtures.ts`. Verifies:

- Admin user sees the Admin dropdown trigger on /dashboard
- Clicking it reveals links to /admin/templates and /admin/audit
- Clicking "Templates" navigates to /admin/templates
- Regular user does not see the Admin dropdown on /dashboard

## Data dependencies

### `api.users.me`

Returns the authenticated user's record:

```ts
{
  _id: Id<"users">,
  email: string,
  displayName?: string,
  role: "USER" | "ADMIN",
  createdAt: number
}
```

The `role` field is the only field consumed by `AdminMenu`. It is set
server-side in the `users` table and returned by `requireAuth()` — it
cannot be spoofed from the client. The `AdminMenu` component reads
`user?.role === "ADMIN"` to decide whether to render.

Note: `UserMenu` already calls `useQuery(api.users.me)`. Both `AdminMenu`
and `UserMenu` call the same query independently — Convex deduplicates
identical subscriptions, so there is no extra network cost.

## Invariants

### Role gating is server-side trusted

The visibility check `user?.role === "ADMIN"` uses data from
`useQuery(api.users.me)`, which calls `requireAuth()` on the server and
returns the user record from the DB. The client cannot forge the role.
This satisfies PRD §6.4 admin trust posture.

### Admin menu absent for non-admins

When `user?.role !== "ADMIN"`, `AdminMenu` returns `null`. The DOM must
contain no admin-related elements (no hidden elements, no `display:none`).
This is a hard invariant — screen readers and DOM inspectors should not
reveal admin nav to non-admin users.

### Admin menu only in dashboard mode

The inside-case TopNav (the `isCaseRoute` branch) does not render
`AdminMenu`. Admin navigation is irrelevant when viewing a specific case.

### Design token compliance

All styling uses design tokens per WOR-80 rules. No raw Tailwind color,
typography, or spacing classes. The `tests/wor-80/token-usage.test.ts`
scanner will catch violations.

### Focus accessibility

The dropdown trigger button includes
`focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`
matching the StyleGuide token usage for focus states.

## Edge cases

### Loading state

While `useQuery(api.users.me)` is loading (returns `undefined`), `AdminMenu`
returns `null`. The admin dropdown does not flash or render partially. Once
the query resolves, if the user is an admin, the dropdown trigger appears.

### User is null (unauthenticated somehow)

If `user` is `null` (authenticated identity but no user record — shouldn't
happen behind `AuthGuard` but defensively handled), `AdminMenu` returns
`null`.

### Click-outside dismissal

Clicking outside the dropdown closes it, matching `UserMenu` behavior. Uses
the same `mousedown` listener + `useRef` pattern.

### Keyboard navigation

The dropdown trigger is a `<button>` and the items are `<Link>` elements,
so standard keyboard navigation (Tab, Enter, Space) works natively. The
`role="menu"` and `role="menuitem"` attributes match UserMenu's pattern for
screen reader compatibility.

### Both dropdowns open

If both `AdminMenu` and `UserMenu` are open, clicking outside either one
closes both (each has its own independent click-outside listener). This is
acceptable behavior — the same pattern exists for any two independent
dropdowns.

## Non-goals

- **Modifying admin pages** — TemplatesListPage, TemplateEditPage, and
  AuditLogPage are not touched. They already render correctly.
- **Changing AdminGuard** — the route-level protection already works. This
  ticket only adds a navigation entry point.
- **Adding admin links to inside-case nav** — the case nav bar shows case
  context (back link, case name, phase). Admin links are not relevant here.
- **Adding new Convex queries** — `api.users.me` already returns the role
  field. No new backend work needed.
- **Responsive/mobile admin menu** — the ticket doesn't mention mobile
  breakpoints. The admin label text may be hidden on small screens (like
  UserMenu's display name uses `hidden sm:inline`), but this is a
  progressive enhancement, not a hard requirement.

## Test coverage

### AC: Admin user sees Admin menu on dashboard

**Layer:** both | **Unit:** `tests/wor-82/admin-topnav.test.tsx` — renders
AppRoutes at `/dashboard` with `{ role: "ADMIN" }` mock user, asserts an
element with "Admin" text is visible. **E2E:** `e2e/wor-82/admin-topnav.spec.ts`
— logs in as admin, navigates to /dashboard, asserts Admin button is present.

### AC: Non-admin user does not see Admin menu

**Layer:** both | **Unit:** `tests/wor-82/admin-topnav.test.tsx` — renders
at `/dashboard` with `{ role: "USER" }` mock user, asserts no "Admin" nav
element exists. **E2E:** `e2e/wor-82/admin-topnav.spec.ts` — logs in as
regular user, asserts no Admin button on /dashboard.

### AC: Admin dropdown contains Templates and Audit Log links

**Layer:** unit | **File:** `tests/wor-82/admin-topnav.test.tsx` — renders
with admin user, clicks the Admin trigger, asserts two links with hrefs
`/admin/templates` and `/admin/audit` are present.

### AC: Styling matches existing TopNav link styling

**Layer:** unit | **File:** `tests/wor-82/admin-topnav.test.tsx` — asserts
the Admin trigger button has classes `text-label`, `text-text-secondary`,
`hover:bg-surface-subtle`.

### AC: Focus state uses correct tokens

**Layer:** unit | **File:** `tests/wor-82/admin-topnav.test.tsx` — asserts
the Admin trigger button className includes `focus-visible:outline-2`,
`focus-visible:outline-accent`, `focus-visible:outline-offset-2`.

### AC: Server-side trusted role check

**Layer:** unit | **File:** `tests/wor-82/admin-topnav.test.tsx` — verified
implicitly: the mock dispatches `useQuery(api.users.me)` which simulates
the server-side query return. The test confirms the component reads from
this query (not from localStorage, URL params, or other client-side sources).

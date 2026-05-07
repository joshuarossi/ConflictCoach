---
task_id: WOR-83
ticket_summary: "Profile page (/profile) missing — DesignDoc §3.1 lists it as a logged-in route"
ac_refs:
  - "Route /profile is registered in src/App.tsx, nested under AuthGuard, using ReadingLayout (per WOR-30 / DesignDoc layout conventions)"
  - "A new src/pages/ProfilePage.tsx renders the user's email (from useQuery(api.users.me)), the display name as an editable input, a Save button that calls a Convex mutation to update users.displayName, and a Sign out button that delegates to useAuthActions().signOut()"
  - "The TopNav UserMenu dropdown includes a \"Profile\" link to /profile in addition to the existing \"Log out\" entry"
  - "Updating the display name updates the users row and the change is reflected immediately via reactive query"
files:
  - path: src/App.tsx
    role: route
    action: modify
    exports:
      - "App — add /profile route under AuthGuard > ReadingLayout"
  - path: src/pages/ProfilePage.tsx
    role: connected
    action: create
    exports:
      - "ProfilePage — connected component (calls useQuery, useMutation, useAuthActions internally; no props)"
  - path: src/components/layout/TopNav.tsx
    role: connected
    action: modify
    exports:
      - "TopNav — unchanged export; internal UserMenu component gains a Profile link"
  - path: convex/users.ts
    role: mutation
    action: modify
    exports:
      - "me — existing query, unchanged"
      - "updateDisplayName — new mutation to patch displayName on the caller's user record"
  - path: tests/wor-83/profile-page.test.tsx
    role: test-infrastructure
    action: create
    exports:
      - "Unit test suite for ProfilePage rendering, form interaction, and updateDisplayName mutation"
  - path: e2e/wor-83/profile.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "E2E test suite verifying /profile route, display name update persistence, and UserMenu Profile link"
signatures:
  - "export function ProfilePage(): JSX.Element — no props; connected component"
  - |
    export const updateDisplayName = mutation({
      args: { displayName: v.string() },
      handler: async (ctx, args) => { /* patches ctx caller's user row */ }
    })
queries_used:
  - "api.users.me — returns { _id, email, displayName?, role, createdAt }; ProfilePage reads email (rendered read-only) and displayName (pre-fills the editable input)"
  - "api.users.updateDisplayName — mutation; args: { displayName: string }; patches the caller's users row; no return value needed"
invariants:
  - "Auth gate: /profile is only accessible to authenticated users (nested under AuthGuard in App.tsx)"
  - "Email is read-only: ProfilePage renders the email as static text, never in an input; no mutation accepts an email change"
  - "Display name length cap: 80 characters max, enforced in the Convex mutation validator and in the client-side input"
  - "Server-side identity: updateDisplayName derives the user from ctx.auth.getUserIdentity(), never from a userId argument"
  - "Sign out delegates to useAuthActions().signOut() and navigates to /login"
non_goals:
  - "Email editing — PRD §1.3 keeps PII surface minimal; email is read-only in v1"
  - "Avatar upload or profile picture — not mentioned in AC"
  - "Password change or other account security settings"
  - "Display name uniqueness enforcement — not required by the ticket"
tested_by:
  - ac: "Route /profile is registered in src/App.tsx, nested under AuthGuard, using ReadingLayout"
    layer: e2e
    file: e2e/wor-83/profile.spec.ts
    reason: "Route registration and auth gate are best verified by navigating in a real browser; unit tests mock routing"
  - ac: "ProfilePage renders email, editable displayName, Save button, Sign out button"
    layer: both
    file: tests/wor-83/profile-page.test.tsx
  - ac: "TopNav UserMenu dropdown includes a Profile link to /profile"
    layer: e2e
    file: e2e/wor-83/profile.spec.ts
    reason: "UserMenu is an internal component of TopNav; verifying the link navigates correctly requires browser routing"
  - ac: "Updating display name updates users row and change is reflected immediately via reactive query"
    layer: both
    file: tests/wor-83/profile-page.test.tsx
---

# Contract: WOR-83 — Profile page (/profile) missing

## Why this work exists

DesignDoc §3.1 lists `/profile` as a logged-in route for "Display name, email, sign-out," but the route does not exist and there is no UI affordance to reach it. Users currently have no way to see or edit their display name from a dedicated page, and sign-out is only reachable via the TopNav dropdown. This ticket closes the gap by adding the route, page, mutation, and navigation entry.

## Files and exports

### `src/App.tsx` (modify, route)

Add a `<Route path="/profile" element={<ProfilePage />} />` inside the existing `AuthGuard > ReadingLayout` block, alongside `/dashboard`, `/cases/new`, etc. Import `ProfilePage` from `@/pages/ProfilePage`. No other changes.

### `src/pages/ProfilePage.tsx` (create, connected)

**Connected component with no props.** This is the public export. It calls `useQuery(api.users.me)` for the user's data, `useMutation(api.users.updateDisplayName)` for saving, and `useAuthActions()` for sign-out. It manages local state for the display name input, submit-in-progress, and error/success feedback.

Why connected (not presentational): The page is a route-level component with exactly one data source (`api.users.me`) and one mutation. Splitting into a presentational shell would add a file and a prop interface with no testing benefit — the unit tests can mock the Convex hooks directly. This matches the pattern established by `NewCasePage`, `Dashboard`, `ClosedCasePage`, etc.

**Component structure:**
- `<h1>` heading: "Profile"
- Email row: label + read-only text showing `user.email`
- Display name row: label + `<input>` pre-filled with `user.displayName ?? ""`, maxLength 80
- Save button: `<Button>` (default/accent variant), disabled when input is unchanged or empty, calls `updateDisplayName({ displayName })` on click
- Sign out button: `<Button variant="ghost">`, calls `signOut()` then `navigate("/login")`

Design token usage per ticket style guidance: `text-text-primary`, `text-text-secondary`, `bg-surface`, `border-border-default`, `focus:border-accent`, `focus:ring-1 focus:ring-accent` on the input. Save uses the default `<Button>` (bg-accent). Sign out uses `variant="ghost"`.

### `src/components/layout/TopNav.tsx` (modify, connected)

Add a `<Link to="/profile">` menu item inside the `UserMenu` dropdown, between the email display `<div>` and the "Log out" button. The link text is "Profile". It uses the same styling as the existing "Log out" button (`w-full px-3 py-2 text-left text-label text-text-secondary hover:bg-surface-subtle`) but rendered as a `<Link>` (or `<a>`) with `role="menuitem"`. Add `data-testid="profile-link"` for E2E targeting.

### `convex/users.ts` (modify, mutation)

Add a new public mutation `updateDisplayName`. This mutation:
1. Calls `requireAuth(ctx)` to get the authenticated user
2. Validates `displayName` is a non-empty string of at most 80 characters (trimmed)
3. Calls `ctx.db.patch(user._id, { displayName: args.displayName.trim() })`
4. Returns nothing (void)

The validator: `args: { displayName: v.string() }`. The 80-char length check is done in the handler (throw a ConvexError if exceeded), since Convex validators don't support `maxLength`.

## Data dependencies

### `api.users.me` (query, existing)

Returns the full user record: `{ _id: Id<"users">, email: string, displayName?: string, role: "USER" | "ADMIN", createdAt: number }`. ProfilePage reads:
- `email` — rendered as read-only text
- `displayName` — pre-fills the editable input; may be `undefined` for users who haven't set one

### `api.users.updateDisplayName` (mutation, new)

Args: `{ displayName: string }`. Patches the authenticated caller's `users` row. Because `api.users.me` is a reactive query, the ProfilePage input will reflect the updated name immediately after the mutation succeeds — no manual cache invalidation needed.

## Invariants

**Auth gate.** `/profile` is nested under `<AuthGuard />` in `App.tsx`. Unauthenticated users are redirected to `/login` (existing AuthGuard behavior). The `updateDisplayName` mutation calls `requireAuth(ctx)` which throws `UNAUTHENTICATED` if no identity is present.

**Email is read-only.** The email is displayed as plain text (`<p>` or `<span>`), never in an `<input>`. No mutation in this ticket accepts an email parameter. This is a PRD §1.3 constraint to keep PII surface minimal.

**Display name length cap: 80 characters.** Enforced in two places: (1) `maxLength={80}` on the HTML input element (client-side), (2) a length check in the `updateDisplayName` handler that throws `ConvexError("Display name must be 80 characters or fewer")` if the trimmed value exceeds 80. The 80-char limit is consistent with `mainTopic` and other text fields in the app.

**Server-side identity derivation.** `updateDisplayName` derives the user from `requireAuth(ctx)` (which uses `ctx.auth.getUserIdentity()`). It never accepts a `userId` argument. This prevents one user from editing another user's display name.

**Sign out flow.** The Sign out button calls `useAuthActions().signOut()` and then navigates to `/login`. This is the same pattern used in `TopNav.tsx`'s existing "Log out" button.

## Edge cases

**Loading state.** While `useQuery(api.users.me)` is loading (`user === undefined`), the page renders a loading indicator or skeleton. The Save and Sign out buttons are disabled during loading.

**Empty display name.** If `user.displayName` is `undefined` (user never set one), the input is empty. The Save button is disabled when the input is empty (after trim), preventing the user from saving a blank name. If the user clears a previously-set name, Save remains disabled — display name cannot be unset once set via this UI. The mutation also rejects empty strings.

**Save success/error feedback.** On successful save, show a brief success message (e.g., "Display name updated") that auto-dismisses or remains until the next interaction. On error, show the error message in a `text-danger` paragraph (same pattern as `NewCasePage`).

**No changes to save.** The Save button is disabled when the input value matches the current `user.displayName`. This prevents unnecessary mutation calls.

**Sign out confirmation.** Per ticket style guidance, the sign-out button is visually de-emphasized (`variant="ghost"`). No confirmation dialog is required — the existing TopNav logout has no confirmation, and this should match.

## Non-goals

**Email editing.** PRD §1.3 keeps PII surface minimal. Users cannot change their email in v1. This is a deliberate constraint, not a gap.

**Avatar upload or profile picture.** Not mentioned in any AC. The TopNav shows the first initial in a circle; this ticket does not change that.

**Password change or account security settings.** Out of scope for this ticket; no AC mentions it.

**Display name uniqueness.** The ticket does not require display names to be unique across users. The mutation does not check for duplicates.

## Test coverage

### Unit tests (`tests/wor-83/profile-page.test.tsx`)

**AC2: ProfilePage renders email, editable displayName, Save, Sign out.**
- Test that the page renders the user's email as static text (not in an input)
- Test that the display name input is pre-filled with the user's current displayName
- Test that the Save button is present and uses the Button component
- Test that the Sign out button is present with ghost variant styling
- Test that the display name input has maxLength=80

**AC2: Save button calls updateDisplayName mutation.**
- Test that clicking Save with a changed display name calls the mutation with the trimmed value
- Test that Save is disabled when input matches current displayName (no changes)
- Test that Save is disabled when input is empty
- Test that Save is disabled while submission is in progress

**AC4: Display name update reflected immediately.**
- Unit test verifies the mutation is called with correct args; reactivity is inherent to Convex's useQuery and doesn't need explicit unit testing. The E2E test covers the full reactive update.

### E2E tests (`e2e/wor-83/profile.spec.ts`)

**AC1: Route /profile registered under AuthGuard + ReadingLayout.**
- Navigate to `/profile` while authenticated; assert the page loads with the "Profile" heading
- Navigate to `/profile` while unauthenticated; assert redirect to `/login`

**AC3: TopNav UserMenu includes Profile link.**
- Click the user menu button (`data-testid="user-menu-button"`); assert a "Profile" link (`data-testid="profile-link"`) is visible; click it; assert navigation to `/profile`

**AC4: Display name update persists via reactive query.**
- On `/profile`, change the display name input, click Save, assert the input reflects the new value. Optionally navigate away and back to confirm persistence.

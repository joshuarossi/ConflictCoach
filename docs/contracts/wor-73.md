---
task_id: WOR-73
ticket_summary: "E2E test: invite flow (two-user)"
ac_refs:
  - "Test uses two browser contexts (two separate users)"
  - "User A creates a case and obtains the invite link"
  - "User B opens invite link, registers/logs in, and accepts invitation"
  - "User B fills their case form after accepting"
  - "Both users see the case listed in their dashboards"
  - "Case status transitions correctly: DRAFT_PRIVATE_COACHING → BOTH_PRIVATE_COACHING"
  - "Consumed invite link shows error when reused"
files:
  - path: e2e/wor-73/invite-flow.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "Playwright test suite: 'WOR-73: Invite flow (two-user)' — test.describe block with sequential tests exercising the full two-party invite lifecycle"
signatures:
  - "No public API signatures — this is a test file only"
queries_used:
  - "api.cases.create.create — mutation called when User A submits the case creation form (via NewCasePage UI)"
  - "api.invites.getByToken.getByToken — public query consumed by InviteAcceptPage to show invite metadata (initiatorName, mainTopic, category, status)"
  - "api.invites.redeem.redeem — mutation called when User B clicks Accept on the invite page; transitions case DRAFT_PRIVATE_COACHING → BOTH_PRIVATE_COACHING"
  - "api.invites.decline.decline — not directly tested in this spec but is part of the InviteAcceptPage contract"
  - "api.cases.list — query consumed by Dashboard to list cases for each user"
  - "api.cases.get — query consumed by InviteSharingPage to render case metadata"
  - "api.cases.partyStates — query consumed by InviteSharingPage to render initiator's mainTopic"
  - "api.testSupport.createCaseForEmail — test-support mutation used indirectly via createTestCase fixture (not used in this spec; case created via UI instead)"
invariants:
  - "Two isolated browser contexts — User A and User B have independent cookies, auth state, and session storage; no shared state between them"
  - "CLAUDE_MOCK=true must be active — test-mode Password provider and testSupport mutations are gated on this flag"
  - "Invite token is single-use — after User B redeems, the same URL must show an error, never a second accept"
  - "Self-invite prevention — the redeem mutation rejects if invitee === initiator; the test uses two distinct users to avoid this"
  - "Case status transition is atomic — invites/redeem sets inviteeUserId, creates invitee partyState, transitions to BOTH_PRIVATE_COACHING, and consumes the token in one mutation"
  - "Invite URL token extraction — the invite URL from cases/create uses SITE_URL (defaults to https://conflictcoach.app); the test must extract the token from the displayed URL and construct a localhost-relative path /invite/{token}"
  - "No cross-party data leakage — the invite page shows only initiatorName, mainTopic, and category; never description or desiredOutcome"
non_goals:
  - "Private coaching flow — covered by WOR-72 solo full flow"
  - "Joint chat, synthesis, draft coach, closure — all covered by WOR-72"
  - "Logged-out invite view with auth redirect end-to-end — the test logs User B in via fixture hook rather than going through the real auth redirect flow, since the invite token localStorage persistence + login redirect is an auth concern, not an invite concern"
  - "Invitee case form implementation — if /cases/:caseId/form route does not exist, the test asserts navigation to that URL after accept but does not exercise form fields (see Open Questions)"
  - "Privacy/security assertions (403 on cross-party read) — covered by WOR-75"
  - "Decline flow — already covered by WOR-57 invite-logged-in.spec.ts AC6"
tested_by:
  - ac: "Test uses two browser contexts (two separate users)"
    layer: e2e
    file: e2e/wor-73/invite-flow.spec.ts
    reason: "Structural setup concern — verified by the test using browser.newContext() to create two independent Page objects with separate auth"
  - ac: "User A creates a case and obtains the invite link"
    layer: e2e
    file: e2e/wor-73/invite-flow.spec.ts
    reason: "Exercises case creation via UI form + redirect to InviteSharingPage + invite URL extraction from the readonly copyable input"
  - ac: "User B opens invite link, registers/logs in, and accepts invitation"
    layer: e2e
    file: e2e/wor-73/invite-flow.spec.ts
    reason: "User B navigates to /invite/{token} in a separate browser context, authenticates via fixture hook, sees the logged-in invite view, and clicks Accept"
  - ac: "User B fills their case form after accepting"
    layer: e2e
    file: e2e/wor-73/invite-flow.spec.ts
    reason: "After accept, InviteAcceptPage navigates to /cases/:caseId/form; test asserts the URL change and, if the form page exists, fills mainTopic/description/desiredOutcome"
  - ac: "Both users see the case listed in their dashboards"
    layer: e2e
    file: e2e/wor-73/invite-flow.spec.ts
    reason: "Both browser contexts navigate to /dashboard and assert the case row is visible with the correct topic text"
  - ac: "Case status transitions correctly: DRAFT_PRIVATE_COACHING → BOTH_PRIVATE_COACHING"
    layer: e2e
    file: e2e/wor-73/invite-flow.spec.ts
    reason: "After User B accepts, both dashboards should show the case in an active (non-draft) state; the transition is verified indirectly through the dashboard status indicator changing from draft to active"
  - ac: "Consumed invite link shows error when reused"
    layer: e2e
    file: e2e/wor-73/invite-flow.spec.ts
    reason: "After successful redemption, navigating to the same /invite/{token} URL shows 'Invite No Longer Available' with Log in and Go to dashboard links, and no Accept/Decline buttons"
---

# Contract: WOR-73 — E2E test: invite flow (two-user)

## Why this work exists

The invite flow is the critical path that connects two separate users to a shared case. Unlike solo mode (WOR-72), it exercises the full invite token lifecycle: generation, display, redemption by a different user, and single-use enforcement. This is the first test in the project that uses two browser contexts, proving that the auth system, invite token mechanism, and case state transitions work correctly across independent sessions. Per TechSpec section 10.1 test 3, this is one of the highest-value E2E tests for launch criterion 7.1.2: "Two real people can complete end-to-end mediation."

## Files and exports

### `e2e/wor-73/invite-flow.spec.ts` (create, test-infrastructure)

Single Playwright spec file containing one `test.describe` block. Unlike WOR-72's single sequential test, this spec may use multiple `test()` blocks since some ACs are independently verifiable (e.g., consumed token reuse can be a separate test from the happy path). However, the happy path (AC2 through AC6) should be a single sequential test because each step depends on the prior step's state.

The test imports from `../fixtures` (same as all other E2E specs) and uses `createTestUser`, `loginAsUser`, and `callMutation`. It does NOT use `createTestCase` — User A creates the case through the UI form to exercise the invite URL generation and display.

**Critical decision: two browser contexts, not two Playwright `test()` runs.** The test uses `browser.newContext()` to create two independent browser contexts (pageA and pageB) within a single test. This is required because the two users must interact with the same case in a coordinated sequence. Playwright's `browser` fixture is available via `test`'s destructuring: `test('...', async ({ browser }) => { ... })`.

**Critical decision: token extraction from InviteSharingPage, not from fixture.** User A creates the case via the UI form (not solo), gets redirected to `/cases/:caseId/invite` (InviteSharingPage), and the test extracts the invite URL from the readonly `<input type="text" readOnly>` field. Since the backend constructs the URL using `SITE_URL` (which defaults to `https://conflictcoach.app` and won't match the test's localhost), the test must parse the token from the URL path (`/invite/{token}` segment) and construct a relative path for User B's navigation.

**Critical decision: User B logs in via fixture hook, then navigates to invite URL.** Rather than simulating the full login redirect flow (click "Sign in to continue" → login page → redirect back), User B logs in via `loginAsUser(pageB, userB)` first, then navigates to `/invite/${token}`. This is pragmatic — the auth redirect flow is an auth concern, not an invite concern. The logged-in invite view (with Accept/Decline buttons) is the real test surface.

## Data dependencies

### `api.cases.create.create` (mutation)

Called when User A submits the NewCaseForm. Args: `{ category, mainTopic, description?, desiredOutcome?, isSolo: false }`. Returns `{ caseId, inviteUrl }` for two-party cases. The `inviteUrl` is constructed as `${SITE_URL}/invite/${token}`. The test does not consume the mutation return directly — it reads the invite URL from the InviteSharingPage UI (which received it via React Router state).

### `api.invites.getByToken.getByToken` (query, public)

Called by InviteAcceptPage when User B navigates to `/invite/${token}`. Returns `{ status: "ACTIVE", initiatorName, mainTopic, category }` for valid tokens, or `{ status: "CONSUMED" }` / `{ status: "INVALID" }` for used/bad tokens. The test asserts the presence of `initiatorName` and `mainTopic` on the page.

### `api.invites.redeem.redeem` (mutation)

Called when User B clicks Accept. Args: `{ token }`. Atomically: patches case with `inviteeUserId` and `status: "BOTH_PRIVATE_COACHING"`, inserts invitee `partyStates` row, patches token to `CONSUMED`. Returns `{ caseId }`. InviteAcceptPage then navigates to `/cases/${caseId}/form`.

### `api.cases.list` (query)

Called by Dashboard for both users. Returns the user's cases with status, category, mainTopic, and other metadata. The test asserts the case appears in each user's dashboard.

## Invariants

**Two isolated sessions.** The test creates two browser contexts via `browser.newContext()`. Each context has its own cookies, localStorage, and Convex auth session. User A's actions are invisible to User B's context and vice versa, except through shared database state.

**Token single-use enforcement.** The `invites/redeem` mutation atomically consumes the token. After redemption, `getByToken` returns `{ status: "CONSUMED" }`, and InviteAcceptPage renders the "Invite No Longer Available" error view. The test verifies this by navigating to the same `/invite/${token}` URL after successful acceptance.

**SITE_URL token mismatch.** The invite URL displayed on InviteSharingPage uses `SITE_URL` from the Convex backend environment, which defaults to `https://conflictcoach.app`. In E2E tests, the frontend runs on `localhost:5174`. The test MUST extract the token from the displayed URL (parse the path) rather than using the full URL directly. Pattern: `inviteUrl.match(/\/invite\/([^/?]+)/)[1]` → token.

**No cross-party data in invite view.** The invite page shows `initiatorName`, `mainTopic`, and `category` only. The `description` and `desiredOutcome` fields are private to the initiator and never exposed through `getByToken`.

## Edge cases

**Loading state on invite page.** When User B navigates to `/invite/${token}`, there's a brief loading state while `getByToken` and auth state resolve. The test should wait for the Accept button (logged-in) or "Sign in to continue" button (logged-out) to be visible before interacting, with a 10-second timeout.

**Template resolution during case creation.** The `cases/create` mutation requires an active template for the selected category. The seed data (from `convex/seed.ts`) must have templates for at least "workplace" category. If missing, case creation will fail with `NOT_FOUND`. The test should use "workplace" as the category since the seed data covers all five categories.

**InviteSharingPage requires Router state.** The InviteSharingPage reads `inviteUrl` from `location.state` (set by NewCasePage on redirect). If the page is refreshed or navigated to directly (without Router state), it shows "This link is no longer available." The test must not refresh between case creation and invite URL extraction.

**Missing `/cases/:caseId/form` route.** The InviteAcceptPage navigates to `/cases/${caseId}/form` after accept, but this route is not currently defined in `src/App.tsx`. The test should assert the URL change (navigation intent) but handle the possibility that the route 404s. If the route exists and renders a form, the test fills it. If not, the test logs this as a known gap and proceeds to dashboard verification.

**Error display on reused token.** After token consumption, InviteAcceptPage shows "Invite No Longer Available" (from the `invite === null || invite.status === "CONSUMED"` branch). The error view has `<Link to="/login">Log in</Link>` and `<Link to="/dashboard">Go to dashboard</Link>`. These are `<Link>` elements (rendered as `<a>`), not buttons.

## Non-goals

- **Full auth redirect flow testing.** The test uses `loginAsUser` fixture hook rather than clicking "Sign in to continue" → login page → redirect back. Auth redirect correctness is a login page concern.
- **Private coaching, joint chat, synthesis, closure.** These phases are fully covered by WOR-72 (solo full flow). This test ends after invite redemption and dashboard verification.
- **Decline flow.** Already covered by WOR-57 `invite-logged-in.spec.ts` AC6.
- **Third-party reuse of consumed token.** The AC says "Consumed invite link shows error when reused" — this is verified by re-navigating the same user (or either user) to the token URL. Creating a third browser context is unnecessary.
- **Invitee case form `updateMyForm` mutation.** If `/cases/:caseId/form` route doesn't exist, form fill is not tested. The form page and `updateMyForm` mutation are prerequisites from a different ticket.

## Test coverage

| AC                                                                                | Test layer | Verification approach                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test uses two browser contexts                                                    | e2e        | Call `browser.newContext()` twice, create separate `Page` objects. Each gets its own `createTestUser` + `loginAsUser`. Assert independence by verifying User B has no cases on their dashboard before accepting the invite.                                                                        |
| User A creates a case and obtains the invite link                                 | e2e        | Navigate pageA to `/cases/new`. Fill form (category: workplace, mainTopic, description, desiredOutcome, isSolo: false). Submit. Wait for redirect to `/cases/:caseId/invite`. Extract invite URL from the readonly input field on InviteSharingPage. Parse token from URL.                         |
| User B opens invite link, registers/logs in, and accepts invitation               | e2e        | Log in User B via `loginAsUser(pageB, userB)`. Navigate pageB to `/invite/${token}`. Assert heading contains User A's display name ("has invited you"). Assert mainTopic and category are visible. Click Accept button. Assert navigation to `/cases/:caseId/form` (URL check).                    |
| User B fills their case form after accepting                                      | e2e        | After accept redirect, if the form page renders: fill mainTopic, description, desiredOutcome fields and submit. If the route 404s: assert URL is correct and skip form fill (log warning).                                                                                                         |
| Both users see the case listed in their dashboards                                | e2e        | Navigate pageA to `/dashboard`. Assert case row with the mainTopic text is visible. Navigate pageB to `/dashboard`. Assert same case row is visible.                                                                                                                                               |
| Case status transitions correctly: DRAFT_PRIVATE_COACHING → BOTH_PRIVATE_COACHING | e2e        | After User B accepts, verify on both dashboards that the case status indicator reflects an active (non-draft) state. The dashboard's `statusIndicator` function maps BOTH_PRIVATE_COACHING to either "Your turn" (green) or "Waiting" (gray) depending on private coaching completion.             |
| Consumed invite link shows error when reused                                      | e2e        | After successful accept, navigate pageB (or pageA) to `/invite/${token}` again. Assert text "already been used" or "no longer valid" is visible. Assert `<a>` with "Log in" text is visible. Assert `<a>` with "Go to dashboard" text is visible. Assert no Accept or Decline buttons are present. |

## Open questions

**Q1: Missing `/cases/:caseId/form` route.** The InviteAcceptPage navigates to `/cases/${caseId}/form` after accept (line 108 of InviteAcceptPage.tsx), but `src/App.tsx` has no matching `<Route>` for this path. The closest route is `/cases/:caseId` (CaseDetail). This means AC4 ("User B fills their case form") may not be fully testable until the invitee form page/route is implemented. The contract assumes the test asserts the navigation URL and attempts to interact with whatever page renders. If the route 404s, the test should proceed to dashboard verification without failing — the form page is a dependency, not part of this test's implementation scope.

**Q2: SITE_URL environment variable in E2E.** The `cases/create` mutation builds the invite URL using `process.env.SITE_URL ?? "https://conflictcoach.app"`. If `SITE_URL` is not set in the Convex backend's E2E environment, the invite URL displayed on InviteSharingPage will point to `https://conflictcoach.app`, not `localhost:5174`. The test handles this by extracting the token and constructing a relative URL. However, if SITE_URL is correctly set to `http://localhost:5174`, the full URL would work directly. The contract specifies token extraction as the safe default.

**Q3: NewCaseForm progressive disclosure.** The NewCaseForm uses progressive disclosure — fields appear sequentially as the user fills prior fields (category → mainTopic → description → desiredOutcome). The test must fill fields in order and wait for each subsequent field to appear before filling it. The "Other person's name" field only appears when `isSolo` is false (the default), so the test should see it without expanding Advanced.

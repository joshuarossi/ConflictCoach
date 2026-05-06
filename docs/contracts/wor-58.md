---
task_id: WOR-58
ticket_summary: "Invitee case form (post-acceptance form submission)"
ac_refs:
  - "cases/updateMyForm mutation updates the invitee's partyStates form fields (mainTopic, description, desiredOutcome)"
  - "Mutation enforces the caller is a party to the case (via partyStates lookup and auth check)"
  - "Form UI matches case creation form steps 2–4: mainTopic (with character counter), description (with lock icon + 'Private to you' helper), desiredOutcome (with lock icon + 'Private to you' helper)"
  - "Privacy lock icons and helper text are present on private fields (description and desiredOutcome)"
  - "On submit, the user is routed to /cases/:id/private to begin private coaching"
  - "Form validates: mainTopic is required; inline error messages for missing fields"
files:
  - path: convex/cases/updateMyForm.ts
    role: mutation
    action: create
    exports:
      - "updateMyForm — Convex mutation that updates the caller's partyStates form fields"
  - path: src/pages/InviteeCaseFormPage.tsx
    role: connected
    action: create
    exports:
      - "InviteeCaseFormPage — connected page component (reads case via useQuery, calls updateMyForm mutation, handles routing)"
  - path: src/components/InviteeCaseForm.tsx
    role: presentational
    action: create
    exports:
      - "InviteeCaseForm — presentational form component (props-driven, no hooks, renders mainTopic/description/desiredOutcome fields)"
      - "InviteeCaseFormValues — TypeScript interface for form field values"
  - path: src/App.tsx
    role: route
    action: modify
    exports:
      - "App (existing) — add route /cases/:caseId/form pointing to InviteeCaseFormPage"
  - path: tests/wor-58/updateMyForm.test.ts
    role: test-infrastructure
    action: create
    exports:
      - "unit tests for the updateMyForm mutation"
  - path: tests/wor-58/InviteeCaseForm.test.tsx
    role: test-infrastructure
    action: create
    exports:
      - "unit tests for the InviteeCaseForm presentational component"
  - path: e2e/wor-58/invitee-form.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "e2e tests for the invitee form flow"
signatures:
  - |
    // convex/cases/updateMyForm.ts
    export const updateMyForm = mutation({
      args: {
        caseId: v.id("cases"),
        mainTopic: v.string(),
        description: v.optional(v.string()),
        desiredOutcome: v.optional(v.string()),
      },
      handler: async (ctx, args) => Promise<void>
    });
  - |
    // src/components/InviteeCaseForm.tsx
    export interface InviteeCaseFormValues {
      mainTopic: string;
      description: string;
      desiredOutcome: string;
    }
    export interface InviteeCaseFormProps {
      onSubmit: (values: InviteeCaseFormValues) => void;
      disabled?: boolean;
      initialMainTopic?: string; // pre-populated from case's shared mainTopic context
    }
    export function InviteeCaseForm(props: InviteeCaseFormProps): JSX.Element;
  - |
    // src/pages/InviteeCaseFormPage.tsx
    export function InviteeCaseFormPage(): JSX.Element;
    // Connected component: reads caseId from useParams, calls api.cases.get
    // to verify case exists and user is a party, calls
    // api.cases.updateMyForm.updateMyForm on submit, navigates to
    // /cases/:caseId/private on success.
queries_used:
  - "api.cases.get — fetch case data to verify user is a party and case exists; provides otherPartyName for page header context"
  - "api.cases.updateMyForm.updateMyForm — mutation to persist invitee's form fields to their partyStates row"
invariants:
  - "The caller must be authenticated (UNAUTHENTICATED error if not)"
  - "The caller must have a partyStates entry for the given caseId (FORBIDDEN error if not)"
  - "mainTopic must be a non-empty string after trimming (INVALID_INPUT error if empty)"
  - "The mutation must NOT allow updates after privateCoachingCompletedAt is set on the caller's partyStates row (FORBIDDEN error — form is locked once coaching starts completing)"
  - "description and desiredOutcome fields are private to the invitee — the UI must show lock icon and 'Private to you' helper text"
  - "The page never fetches the other party's private messages or private form fields"
non_goals:
  - "Category selection — the invitee form does NOT include category; the category is set by the initiator at case creation"
  - "Solo mode toggle — not relevant for invitee form"
  - "Editing the form after submission and navigation to private coaching — this is a single-submit form"
  - "Pre-populating description/desiredOutcome from the initiator — those are private to the initiator"
tested_by:
  - ac: "cases/updateMyForm mutation updates the invitee's partyStates form fields (mainTopic, description, desiredOutcome)"
    layer: unit
    file: tests/wor-58/updateMyForm.test.ts
  - ac: "Mutation enforces the caller is a party to the case (via partyStates lookup and auth check)"
    layer: unit
    file: tests/wor-58/updateMyForm.test.ts
  - ac: "Form UI matches case creation form steps 2–4: mainTopic (with character counter), description (with lock icon + 'Private to you' helper), desiredOutcome (with lock icon + 'Private to you' helper)"
    layer: both
    file: tests/wor-58/InviteeCaseForm.test.tsx
  - ac: "Privacy lock icons and helper text are present on private fields (description and desiredOutcome)"
    layer: unit
    file: tests/wor-58/InviteeCaseForm.test.tsx
  - ac: "On submit, the user is routed to /cases/:id/private to begin private coaching"
    layer: e2e
    file: e2e/wor-58/invitee-form.spec.ts
    reason: "Routing after mutation success requires a real Convex backend and React Router integration that unit-level mocks cannot faithfully reproduce"
  - ac: "Form validates: mainTopic is required; inline error messages for missing fields"
    layer: both
    file: tests/wor-58/InviteeCaseForm.test.tsx
---

# Contract: WOR-58 — Invitee case form (post-acceptance form submission)

## Why this work exists

After an invitee accepts their invite link (WOR-57/T35), they are bound to the case but have no structured context for the AI Private Coach to work with. This ticket builds the backend mutation (`cases/updateMyForm`) and the frontend form UI that captures the invitee's perspective — mainTopic, description, and desiredOutcome — mirroring the initiator's case creation form (steps 2–4) but scoped to the invitee's private party state. Without this, the invitee enters private coaching with an empty partyStates row and the AI coach has nothing to ground its initial guidance on.

## Files and exports

### `convex/cases/updateMyForm.ts` (mutation, create)

New Convex mutation file, following the convention established by `convex/cases/create.ts`. Lives in the `convex/cases/` directory alongside `create.ts`. Exports a single `updateMyForm` mutation that:

1. Calls `requireAuth(ctx)` to get the authenticated user.
2. Validates `mainTopic` is non-empty (throws `INVALID_INPUT`).
3. Looks up the caller's `partyStates` row via the `by_case_and_user` index on `(caseId, userId)`.
4. If no partyStates row exists, throws `FORBIDDEN` — the caller is not a party.
5. If `privateCoachingCompletedAt` is already set on that row, throws `FORBIDDEN` — the form is locked.
6. Patches the partyStates row with `{ mainTopic, description, desiredOutcome, formCompletedAt: Date.now() }`.

Returns `void`. The mutation sets `formCompletedAt` to mark the form as completed, which is an existing field on the `partyStates` schema.

### `src/components/InviteeCaseForm.tsx` (presentational, create)

A **presentational** form component that mirrors steps 2–4 of `NewCaseForm.tsx`. This is a separate component (not a mode of NewCaseForm) because:

- It omits category selection (step 1) and solo mode toggle (step 5) entirely.
- It has no progressive disclosure — all three fields are visible immediately since the invitee has already committed to the case.
- Its validation is simpler (only mainTopic required).

Reuses the same UI patterns from `NewCaseForm.tsx`:

- `PrivateFieldLabel` pattern (lock icon + "Private to you" helper text) for description and desiredOutcome fields.
- 140-char soft limit character counter on mainTopic.
- `autoGrow` textarea behavior for description and desiredOutcome.
- `bg-private-tint` background on private textareas.
- `aria-describedby`, `aria-live="polite"` for accessibility.

Note: Rather than importing `PrivateFieldLabel` from NewCaseForm (which doesn't export it), this component should define its own identical copy or the implementation author may choose to extract it to a shared location. The contract does not mandate extraction — either approach is acceptable as long as the visual and accessibility behavior matches.

Props interface:

- `onSubmit(values: InviteeCaseFormValues)` — called with validated form values on submit.
- `disabled?: boolean` — disables all inputs and the submit button (used during mutation in-flight).
- `initialMainTopic?: string` — optional pre-fill hint. The invitee sees the initiator's mainTopic on the invite page but writes their own; this prop is available if the page wants to suggest it but is NOT required.

### `src/pages/InviteeCaseFormPage.tsx` (connected, create)

The **connected** page component. This is the public API — it is what the route renders and what tests mount when testing the full form flow. It:

1. Reads `caseId` from `useParams<{ caseId: string }>()` and casts to `Id<"cases">`.
2. Calls `useQuery(api.cases.get, { caseId })` to verify the case exists and the user is a party.
3. Renders a loading skeleton while query is undefined.
4. Renders a not-found view if query returns null.
5. Renders `<InviteeCaseForm>` when data is available.
6. On submit, calls `useMutation(api.cases.updateMyForm.updateMyForm)` with `{ caseId, ...formValues }`.
7. On success, calls `navigate(\`/cases/${caseId}/private\`)`.
8. On error, displays an inline error message (using `parseConvexError` from `@/lib/errors`).

The page lives under `ReadingLayout` (720px max-width), matching the case creation form.

### `src/App.tsx` (route, modify)

Add one route inside the `<ReadingLayout>` group under `<AuthGuard>`:

```tsx
<Route path="/cases/:caseId/form" element={<InviteeCaseFormPage />} />
```

This matches the navigation target already established in `InviteAcceptPage.tsx` line 108: `navigate(\`/cases/${result.caseId}/form\`)`.

## Data dependencies

### `api.cases.get` (existing query, read-only)

Called with `{ caseId }`. Returns the case document including `status`, `category`, `isSolo`, `otherPartyName`, or `null` if not found. The form page uses this to:

- Verify the user is a party (the query itself throws FORBIDDEN if not).
- Display contextual information (e.g., "Case with {otherPartyName}") in the page header.
- Potentially guard against rendering the form if the case is in a wrong state (though the mutation is the authoritative guard).

### `api.cases.updateMyForm.updateMyForm` (new mutation)

Called with `{ caseId: Id<"cases">, mainTopic: string, description?: string, desiredOutcome?: string }`. Writes to the caller's `partyStates` row. Fields consumed:

- `mainTopic` — required, rendered in the main topic input.
- `description` — optional, rendered in the private description textarea.
- `desiredOutcome` — optional, rendered in the private desired outcome textarea.
- `formCompletedAt` — set automatically by the mutation to `Date.now()`.

## Invariants

### Authentication required

The `updateMyForm` mutation calls `requireAuth(ctx)` as its first operation. Unauthenticated callers receive an `UNAUTHENTICATED` error. This matches the pattern in `cases/create.ts`.

### Party authorization

The mutation looks up the caller's `partyStates` row via `db.query("partyStates").withIndex("by_case_and_user", q => q.eq("caseId", caseId).eq("userId", user._id))`. If no row exists, the caller is not a party and receives a `FORBIDDEN` error. This is stricter than checking `cases.initiatorUserId / inviteeUserId` — it verifies the partyStates row was actually created (which happens during invite redemption).

### Form lock after coaching starts

If the caller's `partyStates.privateCoachingCompletedAt` is set (not null/undefined), the mutation throws `FORBIDDEN` with a message like "Form is locked after private coaching completion." This prevents retroactive edits to form fields that the AI coach has already used as context.

### mainTopic validation

`mainTopic` must be a non-empty string after `.trim()`. If empty, the mutation throws `INVALID_INPUT` with "mainTopic is required". The frontend enforces this with an inline error message before submission, but the backend is the authoritative validator.

### Privacy of description and desiredOutcome

These fields are private to the filling party per the PRD visibility matrix (§6.1). The UI must display the lock icon (lucide `Lock`, 16px, `text-text-secondary`, `strokeWidth={1.5}`) and "**Private to you** — Only you and the AI coach will see this." helper text on both fields, matching the existing `PrivateFieldLabel` pattern in `NewCaseForm.tsx`.

### No cross-party data fetching

The page calls `api.cases.get` which returns case-level metadata (status, category, otherPartyName) but never the other party's private form fields. The `partyStates` query is NOT called from this page — the form only writes, it does not read any party state data.

## Edge cases

### Loading state

While `useQuery(api.cases.get)` returns `undefined`, the page renders a skeleton matching the `CaseDetailSkeleton` pattern — a few `<Skeleton>` blocks for the heading and form area.

### Not found / not authorized

If `api.cases.get` returns `null` (case not found or user not a party), the page renders a not-found view with a link back to `/dashboard`, matching the `NotFoundView` pattern in `CaseDetail.tsx`.

### Mutation error

If `updateMyForm` throws (e.g., `FORBIDDEN` because coaching already started, or a transient error), the page displays the error inline above the submit button using `parseConvexError`, and re-enables the form so the user can retry. The page does NOT navigate on error.

### Empty mainTopic submission

If the user clicks submit with an empty mainTopic, the frontend shows an inline error "Please describe the main topic." (matching the copy from `NewCaseForm.tsx`) and prevents the form submission. The backend also validates, so even if the frontend guard is bypassed, the mutation rejects it.

### Character counter over limit

The mainTopic character counter turns `text-danger` when over 140 characters (soft limit, not a hard block). This matches the existing `NewCaseForm.tsx` behavior — the form still submits, but the counter provides visual feedback.

## Non-goals

- **Category selection** — The category is set by the initiator at case creation. The invitee form does not include a category step.
- **Solo mode** — The solo mode toggle is not relevant for the invitee form. Solo cases have their invitee partyStates pre-populated at creation time.
- **Re-editing after navigation** — Once the invitee submits and navigates to `/cases/:id/private`, there is no "go back and edit form" flow in v1. The form is a single-submit step.
- **Pre-populating from initiator's private data** — The invitee's description and desiredOutcome are their own. The initiator's values are never shown or used as defaults.
- **Status transition** — The `updateMyForm` mutation does NOT transition the case status. The case status transitions (e.g., `DRAFT_PRIVATE_COACHING` → `BOTH_PRIVATE_COACHING`) are handled by the invite redemption (T35) which is already merged.

## Test coverage

### AC: updateMyForm mutation updates partyStates — `tests/wor-58/updateMyForm.test.ts` (unit)

Call the mutation with valid `{ caseId, mainTopic, description, desiredOutcome }` as an authenticated user who has a partyStates row. Verify the partyStates row is patched with the new values and `formCompletedAt` is set.

### AC: Mutation enforces party authorization — `tests/wor-58/updateMyForm.test.ts` (unit)

- Call `updateMyForm` as an unauthenticated user → assert `UNAUTHENTICATED` error.
- Call `updateMyForm` as a user who is NOT a party to the case (no partyStates row) → assert `FORBIDDEN` error.
- Call `updateMyForm` when `privateCoachingCompletedAt` is set → assert `FORBIDDEN` error.

### AC: Form UI matches case creation steps 2–4 — `tests/wor-58/InviteeCaseForm.test.tsx` (unit) + `e2e/wor-58/invitee-form.spec.ts` (e2e)

- Unit: render `<InviteeCaseForm>`, verify mainTopic input with character counter text `0/140` is present, verify description textarea exists, verify desiredOutcome textarea exists.
- E2E: navigate to `/cases/:id/form` after invite acceptance, verify all three fields render with expected labels and placeholders.

### AC: Privacy lock icons and helper text — `tests/wor-58/InviteeCaseForm.test.tsx` (unit)

Render the form and assert that lock icons (svg elements) and "Private to you" text are present adjacent to description and desiredOutcome fields. Check via `screen.getAllByText(/Private to you/)` and verify two instances (one per private field).

### AC: On submit routes to /cases/:id/private — `e2e/wor-58/invitee-form.spec.ts` (e2e)

Fill mainTopic and submit the form. Assert `page.url()` changes to match `/cases/.*/private`. This requires the full stack (Convex backend, React Router) so it is e2e-only.

### AC: mainTopic required + inline errors — `tests/wor-58/InviteeCaseForm.test.tsx` (unit) + `tests/wor-58/updateMyForm.test.ts` (unit)

- Frontend unit: click submit with empty mainTopic, assert `role="alert"` error message appears and `onSubmit` was NOT called.
- Backend unit: call mutation with empty mainTopic, assert `INVALID_INPUT` error.

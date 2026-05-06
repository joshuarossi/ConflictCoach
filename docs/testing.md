# Testing

## Unit Tests (Vitest)

Unit tests live in `tests/` organized by ticket number (e.g. `tests/wor-70/`). Run them with:

```bash
npm run test:unit
```

### Modules Under Test

| Module                                             | Location                      | What It Covers                                                                                                    |
| -------------------------------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| State machine                                      | `convex/lib/stateMachine.ts`  | Case lifecycle transitions, `canEnterJointChat`, `canProposeClosure`, `canConfirmClosure`                         |
| [Prompt assembly](./components/prompt-assembly.md) | `convex/lib/prompts.ts`       | System prompt generation for all 4 AI roles (PRIVATE_COACH, SYNTHESIS, COACH, DRAFT_COACH) with privacy isolation |
| Privacy filter                                     | `convex/lib/privacyFilter.ts` | Verbatim token-matching (≥8 consecutive tokens) to prevent AI from leaking private content                        |
| Compression                                        | `convex/lib/compression.ts`   | Token estimation, message selection, Haiku-based summarization, budget enforcement                                |
| Error mapping                                      | `convex/lib/errors.ts`        | `throwAppError` and error-code-to-HTTP-status mapping                                                             |

### Writing New Tests

- Place tests in `tests/<ticket>/` matching the ticket that introduces the feature.
- Mock the Anthropic SDK with `vi.mock('@anthropic-ai/sdk')` for unit tests (per TechSpec §10.4). The `CLAUDE_MOCK` env var is reserved for E2E tests.
- Privacy invariant tests are critical: always verify that `PRIVATE_COACH` context never includes the other party's messages or form fields.

## E2E Tests (Playwright)

End-to-end tests live in `e2e/` and run against a live Convex dev server:

```bash
npm run test:e2e
```

### Solo Full Flow (Smoke Test)

The `e2e/wor-72/solo-full-flow.spec.ts` suite is the highest-value E2E test. It exercises the entire Conflict Coach lifecycle in a single browser session using solo mode's party toggle (`?as=initiator|invitee`):

1. **Case creation** — fills the creation form, enables the solo toggle in the Advanced section, and submits.
2. **Private coaching (both parties)** — toggles between initiator and invitee, sends messages, verifies mock AI responses stream in, and marks each party's coaching complete.
3. **Synthesis verification** — toggles between parties and checks each sees their own synthesis card.
4. **Joint chat** — enters the joint session, verifies the coach opening message, and sends a user message.
5. **Draft Coach** — opens the Draft Coach panel, converses, clicks "Draft it for me", verifies the DraftReadyCard, and sends the draft into joint chat.
6. **Closure** — proposes a resolution with summary, toggles to the other party, and confirms.
7. **Dashboard** — navigates to `/dashboard` and verifies the case appears in the Closed section.

All transitions are UI-driven (no `advanceCaseToStatus` shortcuts), making this a true integration test. It runs with `CLAUDE_MOCK=true` for deterministic AI responses.

### Invite Flow — Two-User (E2E)

The `e2e/wor-73/invite-flow.spec.ts` suite validates the full two-party invite lifecycle using two isolated Playwright browser contexts (independent cookies and auth state):

1. **User A creates a case** — fills the creation form and submits, then lands on the post-create sharing screen where the invite URL is displayed.
2. **User B accepts the invite** — opens the invite link in a separate browser context, logs in, and clicks Accept. The case transitions from `DRAFT_PRIVATE_COACHING` to `BOTH_PRIVATE_COACHING`.
3. **User B fills the invitee form** — after accepting, User B is routed to the case form and submits their side (main topic, description, desired outcome).
4. **Both dashboards show the case** — both User A and User B see the shared case listed on their dashboards.
5. **Consumed link is rejected** — navigating to the same invite URL a second time shows a `TOKEN_INVALID` error with options to log in or go to the dashboard.

Like the solo flow, the invite flow runs with `CLAUDE_MOCK=true` for deterministic AI responses.

### Privacy Security Suite

The `e2e/wor-75/privacy.spec.ts` suite validates the application's core privacy guarantees at the browser level:

| Test                                | What It Validates                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Cross-party message isolation (AC1) | User B cannot access User A's private coaching messages — server returns `FORBIDDEN`                                     |
| Admin access denial (AC2)           | Admin users cannot read either party's private coaching content                                                          |
| Coach AI leak prevention (AC3)      | Coach responses in joint chat contain no 8-consecutive-token substring from either party's private messages              |
| Party state redaction (AC4)         | The `partyStates` query exposes only phase-level booleans (e.g. `hasCompletedPC`) for the other party, never form fields |
| Loud failure (AC5)                  | All authorization violations produce explicit `FORBIDDEN` errors, not empty results or silent failures                   |

These tests are currently marked `fixme` pending the full E2E auth infrastructure (T49).

Companion Vitest integration tests in `tests/wor-75/` cover the same access-control scenarios at the function level without requiring a browser.

### Admin Template Management

The `e2e/wor-76/admin-templates.spec.ts` suite validates the full admin template lifecycle in a single sequential test:

1. **Admin login** — logs in as an admin user and navigates to `/admin/templates`.
2. **Template creation** — creates a new template with a category and guidance text; verifies it appears in the template list.
3. **Initial version (v1)** — confirms the auto-published v1 is visible in version history.
4. **Case pinning** — creates a case while v1 is current, capturing the `templateVersionId`.
5. **Publish v2** — edits guidance, publishes a new version, and asserts both v1 and v2 appear in version history.
6. **Version pin verification** — queries the case created in step 4 and asserts its `templateVersionId` still points to v1, not v2.
7. **Archive** — archives the template; verifies the "Archived" badge appears in the admin list and that archived templates do not break the category picker on `/cases/new`.
8. **Pinned case still works** — navigates to the pinned case's private coaching page, sends a message, and confirms the mock AI responds, proving template version resolution works for archived templates.

This test uses the `callQuery` fixture (`e2e/fixtures.ts`) which dispatches Convex queries through the `window.__TEST_CALL_QUERY__` browser hook (see `src/testHooks.ts`). Like other E2E tests, it runs with `CLAUDE_MOCK=true`.

## Continuous Integration

The GitHub Actions workflow at `.github/workflows/ci.yml` runs automatically on pushes to `main` and on pull requests targeting `main`.

### Job structure

| Job         | What it runs                               | Depends on                  |
| ----------- | ------------------------------------------ | --------------------------- |
| `lint`      | ESLint + Prettier check                    | —                           |
| `typecheck` | `tsc --noEmit`                             | —                           |
| `unit`      | Vitest (`npm run test:unit`)               | —                           |
| `e2e`       | Playwright against a Convex dev deployment | `lint`, `typecheck`, `unit` |

The `lint`, `typecheck`, and `unit` jobs run in parallel. The `e2e` job is gated behind all three.

### E2E in CI

The E2E job:

- Deploys the Convex schema using `npx convex deploy`.
- Sets `CLAUDE_MOCK=true` so all AI calls use the deterministic stub responder (no real API calls).
- Caches Playwright browsers across runs for faster builds.
- On failure, uploads the Playwright HTML report and screenshots as build artifacts for debugging.

### Required secrets

| Secret              | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `CONVEX_DEPLOY_KEY` | Deploys the Convex schema in the E2E job                         |
| `ANTHROPIC_API_KEY` | Must be present as an env var (not used when `CLAUDE_MOCK=true`) |

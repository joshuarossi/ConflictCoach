---
task_id: WOR-72
ticket_summary: "E2E test: solo full flow (highest-value test)"
ac_refs:
  - "Test creates a solo case via the UI"
  - "Toggles to Initiator: sends private coaching messages, marks complete"
  - "Toggles to Invitee: sends private coaching messages, marks complete"
  - "Verifies synthesis appears for both parties (toggling between them)"
  - "Enters joint chat and exchanges messages"
  - "Uses Draft Coach to draft and send a message"
  - "Proposes closure with summary, toggles to confirm"
  - "Verifies case appears in Closed section on dashboard"
  - "Test passes end-to-end with mock Claude responses"
files:
  - path: e2e/wor-72/solo-full-flow.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "Playwright test suite: 'WOR-72: Solo full flow E2E' — single test.describe block with one long sequential test exercising the entire solo case lifecycle"
signatures:
  - "No public API signatures — this is a test file only"
queries_used:
  - "api.cases.list — dashboard verification: case appears in Closed section after closure"
  - "api.cases.get — implicitly consumed by CaseDetail, PrivateCoachingPage, JointChatPage, ClosedCasePage to render case state"
  - "api.cases.partyStates — consumed by PartyToggle / useActingPartyUserId to switch between initiator and invitee views"
  - "api.privateCoaching.myMessages — consumed by PrivateCoachingPage to render private chat messages"
  - "api.jointChat.messages — consumed by JointChatPage to render joint chat messages"
  - "api.jointChat.mySynthesis — consumed by ReadyForJointPage to render synthesis card"
  - "api.draftCoach.session — consumed by DraftCoachPanel to render draft chat and DraftReadyCard"
  - "api.privateCoaching.sendUserMessage — mutation called when user sends a message in private coaching"
  - "api.privateCoaching.markComplete — mutation called when user clicks 'Mark private coaching complete'"
  - "api.jointChat.sendUserMessage — mutation called when user sends a message in joint chat (including via Draft Coach Send)"
  - "api.jointChat.proposeClosure — mutation called when user proposes resolution"
  - "api.jointChat.confirmClosure — mutation called when other party confirms closure"
  - "api.draftCoach.startSession — mutation called when user clicks 'Draft with Coach'"
  - "api.draftCoach.sendMessage — mutation called when user sends a message in draft coach panel"
  - "api.draftCoach.sendFinalDraft — mutation called when user clicks 'Send this message' on a ready draft"
invariants:
  - "Single browser context, single user session — solo mode exercises the entire lifecycle without a second browser context"
  - "CLAUDE_MOCK=true must be active — all AI responses come from the deterministic stub responder in convex/lib/claudeMock.ts"
  - "Party toggle via ?as=initiator|invitee URL param drives all data queries; the test must toggle explicitly before interacting with each party's views"
  - "State machine flow exercised in order: DRAFT_PRIVATE_COACHING -> BOTH_PRIVATE_COACHING -> READY_FOR_JOINT -> JOINT_ACTIVE -> CLOSED_RESOLVED"
  - "No use of advanceCaseToStatus — this test drives every transition through the UI, not via test-support shortcuts"
  - "Draft Coach never auto-sends — the test must explicitly click 'Send this message' to move a draft into joint chat"
  - "Private coaching data isolation — messages sent as initiator must not be visible when toggled to invitee, and vice versa"
non_goals:
  - "Two-party (non-solo) flow — that is a separate test (invite-flow.spec.ts / future ticket)"
  - "Privacy/security assertions (403 on cross-party read) — covered by privacy.spec.ts (WOR-75)"
  - "Admin template management — separate test coverage"
  - "Error state testing (AI failures, network errors) — this is a happy-path smoke test"
  - "Keyboard-only accessibility — covered by wor-68-keyboard.spec.ts"
  - "Console error assertion — nice-to-have but not an AC; omit unless trivially achievable"
tested_by:
  - ac: "Test creates a solo case via the UI"
    layer: e2e
    file: e2e/wor-72/solo-full-flow.spec.ts
    reason: "Full UI flow — must exercise the case creation form with solo toggle in a real browser"
  - ac: "Toggles to Initiator: sends private coaching messages, marks complete"
    layer: e2e
    file: e2e/wor-72/solo-full-flow.spec.ts
    reason: "Exercises party toggle, private coaching chat with mock AI streaming, and mark-complete CTA"
  - ac: "Toggles to Invitee: sends private coaching messages, marks complete"
    layer: e2e
    file: e2e/wor-72/solo-full-flow.spec.ts
    reason: "Same flow as initiator but from invitee perspective; verifies case transitions to synthesis after both complete"
  - ac: "Verifies synthesis appears for both parties (toggling between them)"
    layer: e2e
    file: e2e/wor-72/solo-full-flow.spec.ts
    reason: "Synthesis is generated server-side by an AI action; must verify reactive query delivers it to the UI"
  - ac: "Enters joint chat and exchanges messages"
    layer: e2e
    file: e2e/wor-72/solo-full-flow.spec.ts
    reason: "Exercises joint chat page, coach opening message, and user message send with mock Coach response"
  - ac: "Uses Draft Coach to draft and send a message"
    layer: e2e
    file: e2e/wor-72/solo-full-flow.spec.ts
    reason: "Exercises Draft Coach panel open, draft conversation, 'Draft it for me', DraftReadyCard, and 'Send this message' gate"
  - ac: "Proposes closure with summary, toggles to confirm"
    layer: e2e
    file: e2e/wor-72/solo-full-flow.spec.ts
    reason: "Exercises closure modal, proposal mutation, party toggle to other party, confirmation banner, and confirm mutation"
  - ac: "Verifies case appears in Closed section on dashboard"
    layer: e2e
    file: e2e/wor-72/solo-full-flow.spec.ts
    reason: "Dashboard navigation and reactive query verification after case closure"
  - ac: "Test passes end-to-end with mock Claude responses"
    layer: e2e
    file: e2e/wor-72/solo-full-flow.spec.ts
    reason: "Meta-AC — the entire test passing constitutes verification; CLAUDE_MOCK=true is set in playwright.config.ts webServer.env"
---

# Contract: WOR-72 — E2E test: solo full flow (highest-value test)

## Why this work exists

Solo mode lets a single browser session exercise the entire Conflict Coach lifecycle without needing two browser contexts. Per TechSpec $10.1 test 2, this is the highest-value E2E test because it is the fastest end-to-end smoke test and will reveal integration bugs across all phases before user-facing polish. This test is the primary gate for launch criterion $7.1.4: "Solo mode works end-to-end."

## Files and exports

### `e2e/wor-72/solo-full-flow.spec.ts` (create, test-infrastructure)

Single Playwright spec file containing one `test.describe` block with one long sequential test (not broken into independent `test()` blocks, because each phase depends on the prior phase's state). The test follows the project convention established by `e2e/wor-53/case-closure-flow.spec.ts` and `e2e/wor-71/streaming-mock.spec.ts`: imports from `../fixtures`, uses `createTestUser` + `loginAsUser` for setup, and interacts with the UI through Playwright locators (`getByRole`, `getByText`, `getByTestId`, `locator`).

**Critical decision: UI-driven case creation, not `createTestCase` fixture.** Unlike other tests that use the `createTestCase` fixture to skip the form, this test exercises the case creation form directly (AC 1 requires "via the UI"). The test fills the form fields, toggles solo mode in the Advanced section, and submits. It extracts the caseId from the redirect URL.

**Critical decision: no `advanceCaseToStatus` shortcuts.** Every state transition is driven through UI interactions (sending messages, clicking CTAs, toggling parties) to verify the full integration. This is the defining characteristic of this test vs. the per-feature tests that use `advanceCaseToStatus` to jump to a specific phase.

## Data dependencies

This test does not call Convex queries directly. It exercises them indirectly through the UI pages that subscribe to them:

- **`api.cases.get`** — CaseDetail reads `status`, `isSolo`, `category`, `initiatorUserId`. The test asserts status transitions indirectly by verifying the UI changes (e.g., synthesis card appears after both parties complete private coaching).
- **`api.cases.partyStates`** — PartyToggle and `useActingPartyUserId` read `self.role` and `all` (for solo mode party list). The test toggles via URL param `?as=initiator|invitee`.
- **`api.privateCoaching.myMessages`** — PrivateCoachingPage renders messages. The test sends a message and asserts the mock AI response appears (text content from `claudeMock.ts` PRIVATE_COACH role).
- **`api.jointChat.mySynthesis`** — ReadyForJointPage renders `synthesisText` from the acting party's `partyState`. The test verifies markdown-formatted content is visible.
- **`api.jointChat.messages`** — JointChatPage renders joint messages. The test verifies the Coach opening message and user messages appear.
- **`api.draftCoach.session`** — DraftCoachPanel renders the draft conversation and DraftReadyCard. The test verifies the draft text appears and the "Send this message" button works.
- **`api.cases.list`** — Dashboard renders cases grouped by status. The test navigates to `/dashboard` and verifies the case appears in the Closed section.

## Invariants

**Single browser context.** The entire test runs in one Playwright `page` object. Solo mode's party toggle (`?as=initiator|invitee`) switches perspectives without a second browser context. This is the key advantage of solo mode for testing.

**UI-driven state transitions only.** This test must NOT use `advanceCaseToStatus` or `callMutation` to skip phases. Every transition is exercised through button clicks and form submissions, making this a true integration test.

**CLAUDE_MOCK=true deterministic responses.** The test depends on predictable mock AI responses. It should assert on the presence and non-emptiness of AI responses, not on exact text content, since the mock text may change. However, it can assert on structural properties (e.g., DraftReadyCard appears after "Draft it for me", synthesis card contains markdown).

**Sequential phase ordering.** The test must exercise phases in order: case creation -> private coaching (initiator) -> private coaching (invitee) -> synthesis verification -> joint chat -> draft coach -> closure -> dashboard verification. Skipping or reordering phases would miss the integration bugs this test exists to catch.

**Party toggle URL persistence.** When toggling between parties, the test navigates to `?as=initiator` or `?as=invitee`. It should verify the toggle UI reflects the correct party after navigation.

## Edge cases

**Streaming completion timing.** After sending a private coaching message, the mock AI streams a response with configurable delays. The test must wait for the streaming indicator to disappear and the response to show `status=COMPLETE` before proceeding. Use `page.waitForSelector` or `expect(...).toBeVisible({ timeout })` with generous timeouts (10-15s) since mock streaming includes artificial delays.

**Synthesis generation is async.** After both parties mark private coaching complete, synthesis is generated via an AI action. There may be a brief loading state before synthesis text appears. The test should wait for synthesis content to be visible rather than asserting immediately after marking complete.

**Solo mode case creation redirect.** After submitting the case creation form with solo mode enabled, the app redirects to `/cases/:caseId/invite` (the invite sharing page). The test should navigate from there to `/cases/:caseId/private?as=initiator` to begin private coaching. The caseId is extracted from the redirect URL.

**Draft Coach "Draft it for me" trigger.** The mock stub responder for DRAFT_COACH returns a structured `{ draft: '...' }` response when it detects a readiness signal. The test clicks a "Draft it for me" button which sends a canonical message, triggering the structured response. The DraftReadyCard renders the draft text.

**Closure confirmation in solo mode.** After proposing closure as one party, the test toggles to the other party to see the confirmation banner. In solo mode, both parties are the same user, so the toggle switches the acting party. The confirmation banner should show the proposed summary and Confirm/Reject buttons.

## Non-goals

- **Two-party flow testing** — requires two browser contexts and is covered by `invite-flow.spec.ts`.
- **Privacy/security assertions** — direct query-level access control testing is covered by `privacy.spec.ts` (WOR-75). This test only verifies data isolation visually (initiator messages not visible in invitee view).
- **Error state handling** — this is a happy-path test. AI failure, network error, and retry flows are separate test concerns.
- **Admin template management** — out of scope; this test uses the default template created by `testSupport.createCaseForEmail`.
- **Performance/timing assertions** — no assertions on streaming latency or response time.

## Test coverage

| AC                                                                    | Test layer | Verification approach                                                                                                                                                                                                                               |
| --------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test creates a solo case via the UI                                   | e2e        | Fill case creation form (category, main topic, description, desired outcome), expand Advanced, check solo checkbox, submit. Assert redirect to invite/post-create page.                                                                             |
| Toggles to Initiator: sends private coaching messages, marks complete | e2e        | Navigate to `/cases/:caseId/private?as=initiator`. Verify privacy banner visible. Send message, assert mock AI response streams and completes. Click "Mark private coaching complete", confirm dialog. Verify read-only state.                      |
| Toggles to Invitee: sends private coaching messages, marks complete   | e2e        | Navigate to `?as=invitee`. Repeat: send message, verify AI response, mark complete. After both complete, verify navigation/transition to synthesis.                                                                                                 |
| Verifies synthesis appears for both parties (toggling between them)   | e2e        | Navigate to ready-for-joint page. Toggle between parties. Each should see their own synthesis card with non-empty markdown content. Verify "Enter Joint Session" CTA is present.                                                                    |
| Enters joint chat and exchanges messages                              | e2e        | Click "Enter Joint Session". Verify coach opening message appears. Send a user message. Verify it appears in the chat.                                                                                                                              |
| Uses Draft Coach to draft and send a message                          | e2e        | Click "Draft with Coach". Verify side panel opens with privacy banner. Send a message in draft chat. Click "Draft it for me". Verify DraftReadyCard appears with draft text. Click "Send this message". Verify the draft appears in the joint chat. |
| Proposes closure with summary, toggles to confirm                     | e2e        | Click "Close" button. Select "Resolved", enter summary, click "Propose Resolution". Toggle to other party (`?as=invitee` or `?as=initiator`). Verify confirmation banner with summary. Click "Confirm". Verify redirect to closed case view.        |
| Verifies case appears in Closed section on dashboard                  | e2e        | Navigate to `/dashboard`. Verify the case appears in the Closed section (by looking for the case's main topic text or a status indicator).                                                                                                          |
| Test passes end-to-end with mock Claude responses                     | e2e        | Meta-AC: the entire test passing without errors constitutes verification. `CLAUDE_MOCK=true` is configured in `playwright.config.ts` webServer.env.                                                                                                 |

## Open questions

**Q1: Case creation form redirect for solo cases.** The `NewCaseForm` implementation notes say solo cases route to `/cases/:caseId/private` instead of `/cases/:caseId/invite`. However, some code paths may go through the invite page first. The test should handle either redirect path — extract the caseId from whichever URL it lands on and navigate to private coaching from there. The contract assumes the test navigates explicitly after creation rather than relying on a specific redirect target.

**Q2: Solo mode initial case status.** When a solo case is created via the UI form (not `createTestCase` fixture), the case starts at `DRAFT_PRIVATE_COACHING`. The implementation notes say "solo skips straight to `BOTH_PRIVATE_COACHING`." The test should verify what actually happens — if the case starts at `BOTH_PRIVATE_COACHING` (because both parties are bound at creation), private coaching for the initiator can begin immediately. If it starts at `DRAFT_PRIVATE_COACHING`, there may be additional setup steps. The contract assumes the UI handles this transition transparently.

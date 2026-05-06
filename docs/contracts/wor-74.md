---
task_id: WOR-74
ticket_summary: "E2E test: draft coach send gate"
ac_refs:
  - "Test starts a draft session via the Draft Coach panel"
  - "Iterates with Draft Coach (sends messages, receives AI responses)"
  - "Verifies that clicking 'Generate Draft' produces a draft but does NOT post to joint chat"
  - "Verifies that clicking 'Send this message' posts the draft to joint chat"
  - "Discards a draft session and verifies no message appears in joint chat"
  - "Verifies 'Edit before sending' drops text into joint chat input without sending"
files:
  - path: e2e/wor-74/draft-coach-send-gate.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "Playwright test suite: 'WOR-74: Draft Coach send gate E2E' — test.describe block with six focused tests, one per AC"
signatures:
  - "No public API signatures — this is a test file only"
queries_used:
  - "api.draftCoach.session — consumed by ConnectedDraftCoachPanel to render draft conversation and DraftReadyCard"
  - "api.draftCoach.startSession — mutation called when panel opens and user begins interaction (lazy session creation)"
  - "api.draftCoach.sendMessage — mutation called when user sends a message in the draft coach panel"
  - "api.draftCoach.sendFinalDraft — mutation called when user clicks 'Send this message' on DraftReadyCard; the ONLY mutation that posts a draft to joint chat"
  - "api.draftCoach.discardSession — mutation called when user clicks 'Discard' on DraftReadyCard"
  - "api.jointChat.messages — consumed by JointChatView to render joint chat messages; used for count-based assertions"
invariants:
  - "Send gate: draftCoach/sendFinalDraft is the ONLY mutation that posts a draft to joint chat (internally calls jointChat/sendUserMessage). 'Generate Draft' only sets draftSession.finalDraft — it never calls sendUserMessage."
  - "Draft Coach conversation is private to the drafting user — invisible to the other party and to the joint-chat Coach"
  - "No message reaches joint chat without an explicit user click on 'Send this message'"
  - "CLAUDE_MOCK=true must be active — all AI responses come from the deterministic stub responder"
  - "Case must be in JOINT_ACTIVE status for Draft Coach to be available"
  - "Each test uses advanceCaseToStatus fixture to reach JOINT_ACTIVE — this test is NOT a full-flow test (that is WOR-72); it uses shortcuts to focus on the send gate"
non_goals:
  - "Full solo lifecycle flow — covered by WOR-72"
  - "Desktop/mobile responsive layout testing — covered by WOR-51 unit tests (draft-coach-responsive.test.tsx)"
  - "Panel open/close animations or width assertions — covered by WOR-51 E2E (draft-coach-panel.spec.ts)"
  - "Privacy/security assertions on cross-party access — covered by WOR-75"
  - "Error state testing (AI failures, network errors)"
  - "Keep refining with Coach action — not an AC for this ticket; exercised incidentally but not asserted"
tested_by:
  - ac: "Test starts a draft session via the Draft Coach panel"
    layer: e2e
    file: e2e/wor-74/draft-coach-send-gate.spec.ts
    reason: "Must exercise the real UI panel open, privacy banner, and empty chat state in a browser with mock backend"
  - ac: "Iterates with Draft Coach (sends messages, receives AI responses)"
    layer: e2e
    file: e2e/wor-74/draft-coach-send-gate.spec.ts
    reason: "Must verify mock AI streaming response appears in the panel chat area, confirming the full client→mutation→action→mock→UI loop"
  - ac: "Verifies that clicking 'Generate Draft' produces a draft but does NOT post to joint chat"
    layer: e2e
    file: e2e/wor-74/draft-coach-send-gate.spec.ts
    reason: "Core invariant — must count joint chat messages before and after draft generation and assert no increase; unit tests mock the data layer and cannot verify this end-to-end"
  - ac: "Verifies that clicking 'Send this message' posts the draft to joint chat"
    layer: e2e
    file: e2e/wor-74/draft-coach-send-gate.spec.ts
    reason: "Must verify the real mutation path through sendFinalDraft and the resulting reactive query update in joint chat"
  - ac: "Discards a draft session and verifies no message appears in joint chat"
    layer: e2e
    file: e2e/wor-74/draft-coach-send-gate.spec.ts
    reason: "Must verify discard mutation fires and joint chat message count does not change — end-to-end data flow"
  - ac: "Verifies 'Edit before sending' drops text into joint chat input without sending"
    layer: e2e
    file: e2e/wor-74/draft-coach-send-gate.spec.ts
    reason: "Must verify DOM state of #joint-chat-input textarea value and that no message was sent — requires real browser interaction"
---

# Contract: WOR-74 — E2E test: draft coach send gate

## Why this work exists

The Draft Coach's core trust promise is that AI-generated drafts never reach joint chat without explicit user approval (PRD goal #4). This E2E test validates the send gate by exercising the full Draft Coach lifecycle and verifying each user action (Send, Edit, Discard) produces the correct outcome. While WOR-51 tests the same buttons at the component level and WOR-72 exercises Draft Coach as part of the full solo flow, this ticket provides focused, isolated send-gate coverage that directly maps to TechSpec §7's contract: `draftCoach/sendFinalDraft` is the ONLY path to joint chat.

## Files and exports

### `e2e/wor-74/draft-coach-send-gate.spec.ts` (create, test-infrastructure)

Single Playwright spec file containing one `test.describe` block with six tests, one per AC. Each test is independent — they all create their own user, case, and advance to JOINT_ACTIVE via `advanceCaseToStatus`. This follows the same pattern as `e2e/wor-51/draft-coach-actions.spec.ts` but this ticket's tests are the **canonical send-gate tests** while WOR-51's tests were scaffolding written before the implementation existed.

**Critical decision: use `advanceCaseToStatus` shortcut, not UI-driven flow.** Unlike WOR-72 (which drives every transition through the UI), this test uses `advanceCaseToStatus(page, caseId, "JOINT_ACTIVE")` to skip directly to the joint chat phase. The focus is on the Draft Coach send gate, not on the state machine transitions leading up to it.

**Critical decision: extract a shared `openPanelAndGetDraft` helper.** Four of the six ACs (Generate Draft, Send, Discard, Edit) require getting to a state where DraftReadyCard is visible. A shared helper function within the spec file opens the panel, sends a user message, waits for the AI response, clicks "Draft it for me", and waits for the DraftReadyCard to appear. This matches the pattern already established in `e2e/wor-51/draft-coach-actions.spec.ts:42-80`.

**Key test selectors (all already exist in the codebase):**

- `[data-testid='draft-coach-panel']` — panel container
- `[data-testid='draft-ready-card']` — DraftReadyCard container
- `[data-testid='privacy-banner']` — privacy notice in panel header
- `[data-testid='joint-chat-messages'] [data-testid='message']` — joint chat message elements (for counting)
- `#joint-chat-input` — joint chat textarea (for Edit assertion)
- `button role with name /draft with coach/i` — panel open trigger
- `button role with name /draft it for me/i` — readiness trigger
- `button role with name /send this message/i` — send action
- `button role with name /edit before sending/i` — edit action
- `button role with name /discard/i` — discard action
- `[data-author-type='COACH'], [data-role='AI']` — AI response messages in panel

## Data dependencies

This test does not call Convex queries directly. It exercises them through the UI:

- **`api.draftCoach.session`** — ConnectedDraftCoachPanel subscribes to this query to render the draft conversation messages and the `finalDraft` field (which triggers DraftReadyCard rendering). The test asserts on the visible presence of messages and the DraftReadyCard.
- **`api.draftCoach.startSession`** — Called lazily when the user first sends a message in the panel (via `ensureSession()` in ConnectedDraftCoachPanel). The test triggers this by filling the panel input and pressing Enter.
- **`api.draftCoach.sendMessage`** — Called when the user sends a message. Also called when "Draft it for me" is clicked (sends the canonical message `"I'm ready. Please draft a message for me."`). Schedules the `generateResponse` action.
- **`api.draftCoach.sendFinalDraft`** — Called when "Send this message" is clicked. Inserts `finalDraft` into `jointMessages` as a USER message and marks session SENT. **This is the ONLY code path that moves text from Draft Coach to joint chat.** The test verifies this by counting joint messages before and after.
- **`api.draftCoach.discardSession`** — Called when "Discard" is clicked. Marks session DISCARDED. No joint message insertion.
- **`api.jointChat.messages`** — JointChatView subscribes to render messages. The test counts `[data-testid='message']` elements before and after each action to verify presence or absence of new messages.

## Invariants

**The send gate.** The single most important invariant: after clicking "Draft it for me" and seeing the DraftReadyCard, the joint chat message count must NOT have increased. Only after clicking "Send this message" should the count increase by exactly one. This is verified by:

1. Counting `[data-testid='joint-chat-messages'] [data-testid='message']` before opening Draft Coach.
2. Going through the full draft generation flow.
3. Asserting count is unchanged after DraftReadyCard appears.
4. Clicking "Send this message".
5. Asserting count has increased.

**CLAUDE_MOCK=true deterministic responses.** The mock stub responder must handle the DRAFT_COACH role. When it detects a readiness signal (the canonical `"I'm ready. Please draft a message for me."` message), it returns a structured `{ draft: "..." }` response that the `extractDraft()` helper in `convex/draftCoach.ts` can parse. The `_setFinalDraft` mutation stores this as `draftSession.finalDraft`, which triggers DraftReadyCard rendering.

**Independent tests with fresh state.** Each test creates its own user and case. No shared state between tests. This prevents ordering dependencies and allows parallel execution.

**`advanceCaseToStatus` shortcut.** All tests use the fixture to jump to JOINT_ACTIVE. They do NOT drive through private coaching and synthesis. This is intentional — the send gate tests should be fast and focused.

## Edge cases

**Loading state: panel opens with empty chat.** The first test (AC: start a session) should verify the panel opens and shows the privacy banner but no messages. The session is not yet created at this point — it's created lazily on first user message.

**Streaming timing for AI responses.** After sending a message in the panel, the mock AI streams a response with artificial delays. Tests must use `waitFor({ timeout: 15000 })` on the AI response element before proceeding. The selector `[data-author-type='COACH'], [data-role='AI']` identifies coach messages.

**DraftReadyCard appearance timing.** After clicking "Draft it for me", the readiness message is sent, the mock AI responds with a structured draft, and `_setFinalDraft` stores it. The reactive query delivers it to the panel, which renders DraftReadyCard. This involves multiple async steps. The test waits for `[data-testid='draft-ready-card']` with a 15s timeout.

**Multiple draft sessions.** The Discard test and potentially the Edit test create a draft, act on it, then may need to verify the panel state. After Discard, the session status is DISCARDED and the panel closes. A new "Draft with Coach" click would start a fresh session. The test does NOT need to test multi-session behavior — it only verifies the single-session discard outcome.

**Joint chat input value after Edit.** The "Edit before sending" test must read the `#joint-chat-input` textarea's value. The ConnectedDraftCoachPanel's `handleEditDraft` callback calls `onEditDraft(draftText)` which sets the textarea value and closes the panel. The test asserts `inputValue.length > 0` (not exact text match, since mock draft text may change) and that joint message count is unchanged.

## Non-goals

- **Full solo lifecycle flow** — WOR-72 covers the entire case lifecycle end-to-end. This test focuses exclusively on the Draft Coach send gate.
- **Desktop/mobile responsive layout** — WOR-51 unit tests (`draft-coach-responsive.test.tsx`) cover the 420px side panel vs. full-screen bottom sheet layout. This test runs at a default viewport.
- **Panel open/close width assertions** — WOR-51 E2E (`draft-coach-panel.spec.ts`) already asserts the 420px desktop width.
- **Cross-party privacy assertions** — WOR-75 covers 403/not-found on cross-party data access. This test only asserts that draft content appears or doesn't appear in the joint chat.
- **Error state testing** — AI failure retries, network errors, and cost-cap enforcement are out of scope.
- **"Keep refining with Coach" action** — Not an AC. The button exists on DraftReadyCard but its behavior (returning to the draft conversation) is not asserted by this test.

## Test coverage

| AC                                                                                       | Test layer | Verification approach                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test starts a draft session via the Draft Coach panel                                    | e2e        | Create solo case, advance to JOINT_ACTIVE, navigate to `/cases/:caseId/joint`. Click "Draft with Coach" button. Assert `[data-testid='draft-coach-panel']` is visible. Assert `[data-testid='privacy-banner']` is visible. Assert no messages in panel chat area.           |
| Iterates with Draft Coach (sends messages, receives AI responses)                        | e2e        | Open panel. Fill panel textbox, press Enter. Assert user message appears in panel. Wait for AI response (`[data-author-type='COACH']` or `[data-role='AI']`). Assert AI response is non-empty and stays within the panel (joint chat message count unchanged).              |
| Verifies that clicking 'Generate Draft' produces a draft but does NOT post to joint chat | e2e        | Record joint message count. Open panel, send a message, wait for AI response. Click "Draft it for me". Wait for `[data-testid='draft-ready-card']` to appear with draft text. Assert joint message count is UNCHANGED. This is the core gate test.                          |
| Verifies that clicking 'Send this message' posts the draft to joint chat                 | e2e        | Record joint message count. Use `openPanelAndGetDraft` helper to reach DraftReadyCard. Click "Send this message". Assert panel closes (`draft-coach-panel` not visible). Wait for joint message count to increase. Assert the new message's text content matches the draft. |
| Discards a draft session and verifies no message appears in joint chat                   | e2e        | Record joint message count. Use `openPanelAndGetDraft` helper. Click "Discard". Assert panel closes. Assert joint message count is UNCHANGED. Assert `#joint-chat-input` value is empty.                                                                                    |
| Verifies 'Edit before sending' drops text into joint chat input without sending          | e2e        | Record joint message count. Use `openPanelAndGetDraft` helper. Click "Edit before sending". Assert panel closes. Assert `#joint-chat-input` value is non-empty (contains draft text). Assert joint message count is UNCHANGED.                                              |

---
task_id: WOR-89
ticket_summary: "Invitee cannot enter joint session — enterJointSession throws CONFLICT 409 on JOINT_ACTIVE → JOINT_ACTIVE"
ac_refs:
  - "First party can enter the joint session normally. A case with status READY_FOR_JOINT transitions to JOINT_ACTIVE after the first party calls enterJointSession. Coach opening message is scheduled exactly once."
  - "Second party can enter the joint session without error. A case already in JOINT_ACTIVE returns successfully when enterJointSession is called by the other party (the one who didn't trigger the original transition). No error is thrown. The case status remains JOINT_ACTIVE. The Coach opening message is NOT scheduled a second time."
  - "Non-party users still cannot enter. If a user who is neither the initiator nor the invitee calls enterJointSession, the existing requireCaseParty check rejects them with the same authorization error as before. The idempotency change must come AFTER requireCaseParty, not before, so unauthorized callers are not silently no-op'd."
  - "Calling enterJointSession from a CLOSED_ status still errors. If the case is CLOSED_RESOLVED, CLOSED_UNRESOLVED, or CLOSED_ABANDONED, the call must still throw a CONFLICT error via validateTransition. The early-return only applies to the exact target state (JOINT_ACTIVE)."
  - "Calling enterJointSession from DRAFT_PRIVATE_COACHING / BOTH_PRIVATE_COACHING still errors. Premature calls (case not yet ready for joint) must still throw a CONFLICT, same as before."
  - "Unit tests cover the new idempotent path."
  - "Existing tests for enterJointSession continue to pass without modification. The change only adds a new branch; it does not alter the contract of any existing path."
files:
  - path: convex/jointChat.ts
    role: mutation
    action: modify
    exports:
      - "enterJointSessionHandler — add early-return when caseDoc.status === 'JOINT_ACTIVE' (between requireCaseParty and validateTransition)"
      - "enterJointSession — unchanged mutation wrapper"
  - path: tests/wor-89/enter-joint-session-idempotent.test.ts
    role: test-infrastructure
    action: create
    exports:
      - "Unit tests for the idempotent enterJointSession path covering all 5 AC scenarios"
signatures:
  - "enterJointSessionHandler(ctx: any, args: { caseId: string }): Promise<void> — signature unchanged"
  - "enterJointSession — mutation({ args: { caseId: v.id('cases') }, handler: enterJointSessionHandler }) — signature unchanged"
queries_used:
  - "api.jointChat.enterJointSession — the mutation under test (called by both parties)"
  - "api.jointChat.generateOpeningMessage — scheduled by enterJointSession on first-party entry only (not called directly by this work, but its scheduling is an observable side-effect under test)"
invariants:
  - "requireAuth and requireCaseParty execute BEFORE the idempotency early-return; an unauthorized or non-party caller never sees a successful response regardless of case status"
  - "When caseDoc.status is already JOINT_ACTIVE, enterJointSessionHandler returns void without calling validateTransition, ctx.db.patch, or ctx.scheduler.runAfter"
  - "The Coach opening message (generateOpeningMessage) is scheduled exactly once — on the real READY_FOR_JOINT → JOINT_ACTIVE transition, not on the idempotent early-return path"
  - "VALID_TRANSITIONS in convex/lib/stateMachine.ts is NOT modified; the fix is handler-level, not state-machine-level"
  - "All existing transitions (READY_FOR_JOINT → JOINT_ACTIVE, and invalid transitions from CLOSED_*/DRAFT_*/BOTH_*) behave identically to before"
non_goals:
  - "Changes to convex/lib/stateMachine.ts or VALID_TRANSITIONS"
  - "Changes to other state-machine-driven mutations (mark-complete, close-case)"
  - "Frontend error-handling improvements in ReadyForJointView.tsx"
  - "Defensive de-dup inside generateOpeningMessage itself"
tested_by:
  - ac: "First party can enter the joint session normally"
    layer: unit
    file: tests/wor-89/enter-joint-session-idempotent.test.ts
  - ac: "Second party can enter the joint session without error"
    layer: unit
    file: tests/wor-89/enter-joint-session-idempotent.test.ts
  - ac: "Non-party users still cannot enter"
    layer: unit
    file: tests/wor-89/enter-joint-session-idempotent.test.ts
  - ac: "Calling enterJointSession from a CLOSED_ status still errors"
    layer: unit
    file: tests/wor-89/enter-joint-session-idempotent.test.ts
  - ac: "Calling enterJointSession from DRAFT_PRIVATE_COACHING / BOTH_PRIVATE_COACHING still errors"
    layer: unit
    file: tests/wor-89/enter-joint-session-idempotent.test.ts
  - ac: "Unit tests cover the new idempotent path"
    layer: unit
    file: tests/wor-89/enter-joint-session-idempotent.test.ts
  - ac: "Existing tests for enterJointSession continue to pass without modification"
    layer: unit
    file: tests/wor-89/enter-joint-session-idempotent.test.ts
---

# Contract: WOR-89 — Invitee cannot enter joint session (enterJointSession idempotency fix)

## Why this work exists

When both parties complete private coaching and a case reaches READY_FOR_JOINT, only the first party to click "Enter joint session" succeeds. The second party's call hits `validateTransition(JOINT_ACTIVE, JOINT_ACTIVE)`, which correctly rejects a self-transition, throwing a CONFLICT 409. This blocks the core two-party joint chat flow entirely for one participant. The fix makes `enterJointSession` idempotent: if the case is already JOINT_ACTIVE, the handler returns early (success) without mutating state or re-scheduling the opening message.

## Files and exports

### `convex/jointChat.ts` (modify)

The `enterJointSessionHandler` function (currently lines 236–260) gains a single early-return guard inserted **after** `requireCaseParty` and **before** `validateTransition`:

```ts
if (caseDoc.status === "JOINT_ACTIVE") {
  return;
}
```

This is the entire production code change. The guard checks only for the exact target state (`JOINT_ACTIVE`), so all other invalid transitions (from CLOSED_*, DRAFT_*, BOTH_*) still fall through to `validateTransition` and throw CONFLICT as before.

The `enterJointSession` mutation wrapper and its `Object.assign(mutation({...}), { handler })` pattern are unchanged. The `.handler` export for direct unit testing is preserved.

No other functions in `jointChat.ts` are modified.

### `tests/wor-89/enter-joint-session-idempotent.test.ts` (create)

Unit tests that call `enterJointSessionHandler` directly (via the `.handler` export pattern established in the codebase). The test file mocks `ctx` (db, scheduler) and the auth/party helpers to exercise the handler in isolation.

**Test cases (one per AC):**

1. **First-party normal entry** — case status `READY_FOR_JOINT`. Asserts: `ctx.db.patch` called with `{ status: "JOINT_ACTIVE" }`, `ctx.scheduler.runAfter` called once with `api.jointChat.generateOpeningMessage`.
2. **Second-party idempotent entry** — case status already `JOINT_ACTIVE`. Asserts: handler returns successfully (no throw), `ctx.db.patch` NOT called, `ctx.scheduler.runAfter` NOT called.
3. **Non-party when JOINT_ACTIVE** — `requireCaseParty` throws FORBIDDEN. Asserts: handler throws FORBIDDEN before reaching the idempotency guard. Verifies auth runs first.
4. **Premature call (DRAFT_PRIVATE_COACHING)** — Asserts: handler throws CONFLICT via `validateTransition`.
5. **Closed case (CLOSED_RESOLVED)** — Asserts: handler throws CONFLICT via `validateTransition`.

Tests mock `requireAuth` and `requireCaseParty` (imported from `convex/lib/auth` and `convex/jointChat` respectively) using `vi.mock`. The `validateTransition` import is NOT mocked — it runs against the real `VALID_TRANSITIONS` table, which validates that the state machine is untouched.

## Data dependencies

### `api.jointChat.enterJointSession`

The mutation under modification. Takes `{ caseId: Id<"cases"> }`. Internally reads the case document's `status` field. The only field this work's logic branches on is `caseDoc.status`.

### `api.jointChat.generateOpeningMessage`

Scheduled by `ctx.scheduler.runAfter(0, ...)` inside the handler. This work does NOT modify `generateOpeningMessage` — it only ensures the scheduling call happens exactly once (on the first party's real transition) and not on the idempotent path.

## Invariants

### Auth before idempotency

The early-return guard (`if (caseDoc.status === "JOINT_ACTIVE") return`) is placed after both `requireAuth(ctx)` and `requireCaseParty(ctx, args.caseId, user._id)`. An unauthenticated user or a non-party user never reaches the early-return. If this ordering were reversed, a non-party could silently succeed when the case happens to be JOINT_ACTIVE — a privilege escalation.

### No duplicate Coach opening messages

The `ctx.scheduler.runAfter(0, api.jointChat.generateOpeningMessage, ...)` call is only reachable on the real `READY_FOR_JOINT → JOINT_ACTIVE` transition path (after `validateTransition` succeeds). The idempotent early-return exits before this line, so the second party's call never schedules a duplicate opening message.

### State machine untouched

`VALID_TRANSITIONS` in `convex/lib/stateMachine.ts` is not modified. `JOINT_ACTIVE → JOINT_ACTIVE` remains an invalid transition in the state machine. The fix is purely at the handler level — the handler opts out of calling `validateTransition` when it detects the no-op case.

### All other transitions unchanged

Only the exact `caseDoc.status === "JOINT_ACTIVE"` condition triggers the early return. Cases in `CLOSED_RESOLVED`, `CLOSED_UNRESOLVED`, `CLOSED_ABANDONED`, `DRAFT_PRIVATE_COACHING`, `BOTH_PRIVATE_COACHING`, or `READY_FOR_JOINT` all proceed to `validateTransition` exactly as before.

## Edge cases

### Race condition: two simultaneous first-party calls

If both parties click at the exact same instant and both see `READY_FOR_JOINT`, Convex's transactional mutations serialize them. The first mutation to commit transitions to `JOINT_ACTIVE` and schedules the opening message. The second mutation re-reads the case (Convex OCC retries on conflict), sees `JOINT_ACTIVE`, and hits the early-return. This is the correct behavior and requires no special handling beyond the idempotency guard.

### Loading state

Not applicable — this is a backend mutation, not a UI component. The frontend's loading state while the mutation is in-flight is unchanged.

### Error state

The only error change is the removal of the CONFLICT 409 for the second-party path. All other error paths (auth failure, non-party, invalid status transitions) are preserved identically.

## Non-goals

- **No changes to `convex/lib/stateMachine.ts`** — the state machine is correct. The fix is in the handler.
- **No changes to other mutations** — similar idempotency gaps in `mark-complete` or `close-case` are a separate audit.
- **No frontend changes** — once the handler stops throwing, the existing frontend success path navigates the user into joint chat.
- **No changes to `generateOpeningMessage`** — defensive de-dup inside that action is a separate hardening ticket.

## Test coverage

All ACs are verified by unit tests in `tests/wor-89/enter-joint-session-idempotent.test.ts`. Unit testing is sufficient because:

- The handler is exported directly via the `.handler` pattern, allowing isolated invocation.
- The bug and fix are entirely in the mutation's branching logic — no UI rendering, no network, no browser behavior.
- The real `validateTransition` function runs in the unit tests (not mocked), confirming the state machine's behavior is preserved.
- Privacy/auth invariants (requireCaseParty ordering) are verified by asserting the mock throw happens before the early-return path is reachable.

No e2e tests are needed because the fix is a single conditional guard in a backend mutation with no UI-observable change beyond "it works now."

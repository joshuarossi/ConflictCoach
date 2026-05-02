# Testing

## Unit Tests (Vitest)

Unit tests live in `tests/` organized by ticket number (e.g. `tests/wor-70/`). Run them with:

```bash
npm run test:unit
```

### Modules Under Test

| Module | Location | What It Covers |
|---|---|---|
| State machine | `convex/lib/stateMachine.ts` | Case lifecycle transitions, `canEnterJointChat`, `canProposeClosure`, `canConfirmClosure` |
| [Prompt assembly](./components/prompt-assembly.md) | `convex/lib/prompts.ts` | System prompt generation for all 4 AI roles (PRIVATE_COACH, SYNTHESIS, COACH, DRAFT_COACH) with privacy isolation |
| Privacy filter | `convex/lib/privacyFilter.ts` | Verbatim token-matching (≥8 consecutive tokens) to prevent AI from leaking private content |
| Compression | `convex/lib/compression.ts` | Token estimation, message selection, Haiku-based summarization, budget enforcement |
| Error mapping | `convex/lib/errors.ts` | `throwAppError` and error-code-to-HTTP-status mapping |

### Writing New Tests

- Place tests in `tests/<ticket>/` matching the ticket that introduces the feature.
- Mock the Anthropic SDK with `vi.mock('@anthropic-ai/sdk')` for unit tests (per TechSpec §10.4). The `CLAUDE_MOCK` env var is reserved for E2E tests.
- Privacy invariant tests are critical: always verify that `PRIVATE_COACH` context never includes the other party's messages or form fields.

## E2E Tests (Playwright)

End-to-end tests live in `e2e/` and run against a live Convex dev server:

```bash
npm run test:e2e
```

## Continuous Integration

The GitHub Actions workflow at `.github/workflows/ci.yml` runs automatically on pushes to `main` and on pull requests targeting `main`.

### Job structure

| Job | What it runs | Depends on |
|---|---|---|
| `lint` | ESLint + Prettier check | — |
| `typecheck` | `tsc --noEmit` | — |
| `unit` | Vitest (`npm run test:unit`) | — |
| `e2e` | Playwright against a Convex dev deployment | `lint`, `typecheck`, `unit` |

The `lint`, `typecheck`, and `unit` jobs run in parallel. The `e2e` job is gated behind all three.

### E2E in CI

The E2E job:

- Deploys the Convex schema using `npx convex deploy`.
- Sets `CLAUDE_MOCK=true` so all AI calls use the deterministic stub responder (no real API calls).
- Caches Playwright browsers across runs for faster builds.
- On failure, uploads the Playwright HTML report and screenshots as build artifacts for debugging.

### Required secrets

| Secret | Purpose |
|---|---|
| `CONVEX_DEPLOY_KEY` | Deploys the Convex schema in the E2E job |
| `ANTHROPIC_API_KEY` | Must be present as an env var (not used when `CLAUDE_MOCK=true`) |

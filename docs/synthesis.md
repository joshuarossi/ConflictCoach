# Synthesis Generation

When both parties mark private coaching as complete, the platform automatically generates a **synthesis** — individualized guidance that prepares each party for the joint session.

## How It Works

1. **Trigger** — The `markComplete` mutation in `convex/privateCoaching.ts` detects that both parties have finished. It schedules the synthesis action (`convex/synthesis/generate.ts`) via `ctx.scheduler.runAfter`.

2. **Context assembly** — The action reads both parties' form fields (main topic, description, desired outcome) and their full private message histories. It passes all of this to [`assemblePrompt()`](./components/prompt-assembly.md) with the `SYNTHESIS` role.

3. **AI call** — Claude generates a single JSON response containing two fields: `forInitiator` and `forInvitee`. Each field holds tailored guidance covering:
   - Areas of likely agreement
   - Genuine points of disagreement
   - Suggested communication approaches for the joint session

   The call is **non-streaming** (one-shot) per the tech spec.

4. **Privacy filter** — Each synthesis text is checked against the _other_ party's private messages using `checkPrivacyViolation()` from `convex/lib/privacyFilter.ts`. This ensures that neither party's raw words are quoted or closely paraphrased in the other party's guidance.

5. **Retry logic** — If the privacy filter detects a violation, the action regenerates the synthesis (up to 2 retries, 3 total attempts). If all attempts fail, a generic fallback text is substituted and an audit log entry flags the case for admin review.

6. **State mutation** — On success, `writeSynthesisResults` atomically writes `synthesisText` and `synthesisGeneratedAt` to both party states and advances the case status to `READY_FOR_JOINT`.

## Error Handling

The synthesis action follows the project's standard error-handling patterns (see [Error Handling](./error-handling.md)):

- **429 / rate-limit** — Retried automatically.
- **Timeout (>30 s)** — The case is marked with an error state.
- **Content-filter refusal** — No dedicated handler; a refused response will fail JSON
  parsing and consume a retry attempt. After all attempts exhaust, fallback text is used.

## Key Files

| File                           | Purpose                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| `convex/synthesis/generate.ts` | Synthesis action, internal queries, and mutations                                     |
| `convex/privateCoaching.ts`    | Trigger point (`markComplete` schedules synthesis)                                    |
| `convex/lib/privacyFilter.ts`  | Privacy-violation checker used by the synthesis action                                |
| `convex/lib/prompts.ts`        | [`assemblePrompt()`](./components/prompt-assembly.md) builds the system + user prompt |

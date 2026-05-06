# Prompt Assembly

The `assemblePrompt` function in `convex/lib/prompts.ts` is the single entry point for constructing all AI prompts in the system. Every Claude API call flows through this module, which enforces the privacy model by controlling what data each AI role can see.

## Function Signature

```ts
assemblePrompt(opts: AssemblePromptOpts): { system: string; messages: Message[] }
```

### Parameters

| Field              | Type                                                         | Description                                                  |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `role`             | `"PRIVATE_COACH" \| "SYNTHESIS" \| "COACH" \| "DRAFT_COACH"` | The AI role to build a prompt for                            |
| `caseId`           | `Id<"cases">`                                                | The case being worked on                                     |
| `actingUserId`     | `Id<"users">`                                                | The user making the request                                  |
| `recentHistory`    | `Message[]`                                                  | Recent conversation messages (Anthropic SDK format)          |
| `partyStates`      | `PartyState[]?`                                              | Both parties' form fields and synthesis texts                |
| `privateMessages`  | `PrivateMessage[]?`                                          | All private coaching messages (filtered internally per role) |
| `jointMessages`    | `JointMessage[]?`                                            | Joint session chat messages                                  |
| `templateVersion?` | `TemplateVersion`                                            | Optional template with guidance and instructions             |

### Return Value

- **`system`** — The assembled system prompt string.
- **`messages`** — An array of `{ role: "user" | "assistant", content: string }` context messages.

## Privacy Boundaries by Role

Each role has strict rules about what data it may access. These boundaries are **load-bearing** — the correctness of the entire privacy model depends on them.

| Role              | Party States     | Private Messages | Joint Messages | Synthesis        | Template                                |
| ----------------- | ---------------- | ---------------- | -------------- | ---------------- | --------------------------------------- |
| **PRIVATE_COACH** | Acting user only | Acting user only | —              | —                | None (hardcoded prompt)                 |
| **SYNTHESIS**     | Both parties     | Both parties     | —              | —                | None (self-contained prompt)            |
| **COACH**         | Both parties     | **Never**        | Yes            | Both parties     | globalGuidance + coachInstructions      |
| **DRAFT_COACH**   | Acting user only | **Never**        | Yes            | Acting user only | globalGuidance + draftCoachInstructions |

### PRIVATE_COACH

Uses a hardcoded system prompt (per TechSpec §6.3.1). Context includes only the acting user's form fields and private message history. No other party data is ever included. Template instructions are ignored.

### SYNTHESIS

System prompt includes the anti-quotation instruction verbatim (per TechSpec §6.3.2): content from both parties is included so Claude can generate synthesis, but the prompt explicitly forbids quoting or closely paraphrasing the other party's raw words. Output format is JSON with `forInitiator` and `forInvitee` fields.

### COACH

Context includes joint chat history and both parties' synthesis texts. Raw private messages are **never** included. When a `templateVersion` is provided, `globalGuidance` and `coachInstructions` are prepended to the system prompt.

### DRAFT_COACH

Context includes joint chat history and only the acting user's own synthesis. The other party's synthesis and all raw private messages are excluded. When a `templateVersion` is provided, `globalGuidance` and `draftCoachInstructions` are prepended to the system prompt.

## Template Merging

When a `templateVersion` is supplied:

- **`globalGuidance`** is placed first in the system prompt for COACH and DRAFT_COACH roles.
- **`coachInstructions`** follows globalGuidance for the COACH role only.
- **`draftCoachInstructions`** follows globalGuidance for the DRAFT_COACH role only.
- The role's base system prompt appears last.
- PRIVATE_COACH and SYNTHESIS roles ignore template content entirely.

When no `templateVersion` is provided, the system prompt still functions correctly without template content.

## Key Files

| File                                  | Purpose                                                                    |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `convex/lib/prompts.ts`               | `assemblePrompt()` implementation and exported types                       |
| `tests/wor-38/assemblePrompt.test.ts` | Tests for all 6 acceptance criteria including privacy boundary enforcement |

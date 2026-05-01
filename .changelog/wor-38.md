# WOR-38: AI Prompt Assembly Module

Added the `assemblePrompt` function (`convex/lib/prompts.ts`) — the
central module that builds system prompts and context messages for all
four AI roles (PRIVATE_COACH, SYNTHESIS, COACH, DRAFT_COACH). Each role
enforces strict privacy boundaries: Private Coach sees only the acting
user's data, Synthesis includes both parties' content with anti-quotation
rules, Coach receives synthesis texts and joint history but never raw
private messages, and Draft Coach sees only the drafting user's own
synthesis. Template version instructions are merged for Coach and Draft
Coach roles when provided.

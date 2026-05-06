⏺ ConflictCoach Codebase Evaluation                                                                                                                                                                                  
                                                                                          
  Four parallel agents audited the repo independently (backend security, frontend, tests, ops/build). Findings converged strongly. Here's the assessment.                                                            
                                                                                                                                                                                                                     
  Headline grade                                                                                                                                                                                                     
                                                                                                                                                                                                                     
  Impressive prototype, NOT production-ready. ~13.5k LOC of app code + 1742 passing tests across 311 commits looks shippable on the surface, but the autonomous pipeline optimized for "tests green / lint clean"    
  rather than soundness. The seams between layers are papered over with any, the test suite mostly verifies mocked handlers rather than real Convex behavior, and several public-action handlers expose direct
  attacks against other users' private data.                                                                                                                                                                         
                                                         
  The existing docs/codex-review-5-5.md review was largely correct — and the issues are still present. My agents independently re-verified each codex claim against current code and found additional ones.          
  
  ---                                                                                                                                                                                                                
  Critical (fix before any user touches it)              
                                                                                                                                                                                                                     
  1. Public action lets any signed-in user exfiltrate another user's private coaching history
  convex/privateCoaching.ts:150 — generateAIResponse is action() (public), takes caseId and userId as args, performs no auth check, then reads private messages and writes a forged AI message attributed to         
  args.userId. Sister functions: convex/jointChat.ts:732 (generateCoachResponse), :755 (generateOpeningMessage). One-line attack reads victim's prompts into Claude + bills to victim's case + corrupts their message
   log. Fix: convert to internalAction AND change scheduler call site (privateCoaching.ts:123) from api. → internal..                                                                                                
                                                                                                                                                                                                                     
  2. convex/testSupport.ts ships in production builds                                                                                                                                                                
  Public mutations (createCase, setCaseStatus, addPartyState, createCaseForEmail) gated only by runtime check of process.env.CLAUDE_MOCK !== "true". If that env var ever leaks into a non-test deploy, anyone can
  fabricate cases attributed to arbitrary users.                                                                                                                                                                     
                                                         
  3. Schema drift on partyRole                                                                                                                                                                                       
  convex/schema.ts:79 privateMessages has no partyRole, but convex/privateCoaching.ts writes it (lines 117, 137, 370) and filters by it (lines 70, 396). Same pattern in convex/lib/privacyFilter.ts:149-159 (audit
  log inserts actorUserId: "system" against v.id("users")). Either schema validation is silently disabled in deploy or solo-mode is broken — both bad.                                                               
  
  4. Real-looking API keys on developer disk                                                                                                                                                                         
  .env.local (correctly gitignored, never committed) contains sk-ant-api03-eZS6... and GOCSPX-5qvKkQN9.... Verify via git log --all --full-history -- .env.local and rotate if these are real.
                                                                                                                                                                                                                     
  5. Production deploy is not gated on CI
  .github/workflows/deploy-production.yml triggers on push: main with no needs: on ci.yml. Plus continue-on-error: true on the Convex push step — schema-push failures still ship the frontend.                      
                                                                                                                                                                                                                     
  ---
  High-severity                                                                                                                                                                                                      
                                                                                                                                                                                                                     
  - Cost budget TOCTOU race (convex/lib/costBudget.ts:293-336): getCaseAiUsage → check → run AI → record. Concurrent calls all read the same value, all pass the cap. Combined with #1 above, attackers can sustain
  billing damage indefinitely.                                                                                                                                                                                       
  - Type safety is load-bearing-disabled. 13 backend files start with eslint-disable @typescript-eslint/no-explicit-any. Patterns like (internal as any)?.jointChat?.generateCoachResponse (jointChat.ts:167, 414,
  586, 654) silently no-op when codegen drifts — typos become silent feature-disables instead of build errors.                                                                                                       
  - Frontend API surface drift. (api as any).cases.create.create at src/pages/NewCasePage.tsx:10, (api as any).cases.updateMyForm.updateMyForm at InviteeCaseFormPage.tsx:55, (api as any).cases?.get at
  AppLayout.tsx:24 and TopNav.tsx:118. The doubled .create.create strongly implies the agent regenerated function-files and the frontend papered over with any rather than fixing imports. Every refactor of cases   
  silently breaks at runtime.                            
  - getCaseCost (cases.ts:198) bypasses requireAuth with a hand-rolled subject-string compare, dropping the USER_NOT_FOUND guard that every other query uses.                                                        
  - Privacy filter is bypassable by paraphrase. convex/lib/privacyFilter.ts:13 only catches verbatim 8-token spans. A model can defeat it by reordering or dropping function words. The marketing premise is privacy 
  isolation; the defense is a substring match.                                                                                                                                                                       
  - E2E key leak. ci.yml injects ANTHROPIC_API_KEY into the e2e job even with CLAUDE_MOCK=true. Exposes the secret to fork-PR contributor code with no benefit.                                                      
                                                                                                                                                                                                                     
  ---                                                    
  Test suite — high count, low fidelity                                                                                                                                                                              
                                                                                                                                                                                                                     
  - convex-test is not installed (zero matches in package.json or tests/). All 43 backend test files hand-roll mock ctx objects and call .handler via reflection. Index correctness, scheduler, OCC, schema
  validators — all untested.                                                                                                                                                                                         
  - 312 Convex warnings per run of "Convex functions should not directly call other Convex functions… is not supported." This is not a stylistic nit; Convex says it doesn't work in production runtime.
  - Tautological tests abound: tests/wor-61/audit-actions-constants.test.ts:28 asserts a constant equals its own string spelling. tests/wor-71/test-fixtures.test.ts asserts typeof createTestUser === "function".   
  tests/wor-79/ci-job-ordering.test.ts re-reads its own contract from .github/workflows/ci.yml.                                                                                                                      
  - Test runtime is 96% one file: tests/wor-39/stream-ai-response.test.ts uses real setTimeout with 30005ms delays — 36.5s of 37.9s total. Most tests are too shallow to measure.                                    
  - tests/wor-XX/ ticket-ID layout is unmaintainable. WOR-80 contains two unrelated concerns (route layout + token usage). To find "all draft-coach tests" requires grep -r draftCoach.                              
  - E2E gaps: solid coverage of auth/invite/closure/solo-mode, but no joint-mode happy path and no joint-case creation spec. The README's central feature is the least tested end-to-end.                            
                                                                                                                                                                                                                     
  ---                                                                                                                                                                                                                
  Frontend                                                                                                                                                                                                           
                                                         
  Functional but accumulating debt. Token compliance is genuinely high. Concerns:
  - Dead/duplicate components: src/components/chat/{ChatWindow,MessageInput,MessageBubble,StreamingIndicator}.tsx are 1-line re-export shims with zero prod imports — they exist only for tests pinned to a phantom  
  path.                                                                                                                                                                                                              
  - JointChatView.tsx:206-249 re-implements <textarea> with document.getElementById("joint-chat-input") instead of reusing MessageInput. Uncontrolled React, breaks if mounted twice.                                
  - Skeletons / loading screens / "Case not found" states are hand-rolled in 4-6 places each — when design changes, every page must change.                                                                          
  - useActingPartyUserId conflates Convex's undefined-during-load with empty results: callers that wait for null will hang on the skeleton forever when the query legitimately returns empty.                        
  - No route-level code-splitting → 587 KB main chunk; admin pages are bundled for every regular user.                                                                                                               
                                                                                                                                                                                                                     
  ---                                                                                                                                                                                                                
  Ops & tooling                                                                                                                                                                                                      
                                                                                                                                                                                                                     
  - tsconfig.json has noUnusedLocals: false, noUnusedParameters: false — exactly the rails you want on for AI-generated code.
  - @types/react@^19 against react@^18.3.1 — types one major version ahead of runtime.                                                                                                                               
  - 37 tracked files of .agents/ and .claude/ agent-pipeline scaffolding leak generation internals into the product repo.                                                                                            
  - No error tracking, no Sentry/Datadog hooks, no inbound rate limiting on Convex actions. First prod incident will be invisible.                                                                                   
                                                                                                                                                                                                                     
  ---                                                                                                                                                                                                                
  What's actually good                                                                                                                                                                                               
                                                         
  - Domain modeling is clear (cases, party states, private/joint messages, draft sessions, templates, audit log).
  - Docs are unusually complete for auto-generated code (per-feature docs, contracts, design-token guide).                                                                                                           
  - Privacy boundaries are at least acknowledged in code structure (separate joint vs. private message tables, privacy filter, audit log).                                                                           
  - State machine and cost budget are isolated into convex/lib/.                                                                                                                                                     
  - CI runs lint/typecheck/unit/e2e in a sane DAG (the deploy pipeline is the broken part, not CI itself).                                                                                                           
  - Design-token discipline in the frontend is real — the only spot-checked violations were bg-black/30 in dialogs.                                                                                                  
                                                                                                                                                                                                                     
  ---                                                                                                                                                                                                                
  Bottom line                                                                                                                                                                                                        
                                                                                                                                                                                                                     
  For an autonomous Jira-driven generation pipeline, this is genuinely impressive output — most generation pipelines produce a toy. But the metrics it optimized for (tests green, lint clean, tickets closed) are
  not the metrics of a hardened system. The highest-leverage next step is not more tickets and not more tests — it's a pipeline change that:                                                                         
                                                         
  1. Forbids eslint-disable @typescript-eslint/no-explicit-any and as any in convex/ and src/.                                                                                                                       
  2. Forbids action() for handlers that take user/case IDs without re-deriving them from ctx.auth.
  3. Adds convex-test and forbids .handler reflection in tests.                                                                                                                                                      
  4. Gates production deploys on green CI and removes continue-on-error from the Convex push step.                                                                                                                   
                                                                                                                                                                                                                     
  Without those rails, every new ticket adds another any-shaped hole in the same shape as the four critical findings above.           
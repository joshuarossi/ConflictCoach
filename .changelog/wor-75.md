## WOR-75: Privacy security E2E tests and FORBIDDEN error handling

Added a Playwright E2E test suite (`e2e/wor-75/privacy.spec.ts`) and Vitest integration tests that validate the core privacy guarantees: cross-party private message isolation, admin access denial, coach AI response leak prevention (8-token substring check), and partyStates field redaction. Production pages (`CaseDetail`, `JointChatPage`, `PrivateCoachingPage`) now use live Convex queries and a new `ConvexErrorBoundary` that renders a clear FORBIDDEN screen when authorization fails.

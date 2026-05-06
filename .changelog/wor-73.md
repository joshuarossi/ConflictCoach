### WOR-73: E2E test — invite flow (two-user)

Added a Playwright end-to-end test (`e2e/wor-73/invite-flow.spec.ts`) that validates the complete two-user invite lifecycle using two independent browser contexts: User A creates a case and obtains the invite link, User B opens the link, logs in, accepts the invitation, fills their case form, and both users see the shared case on their dashboards. The test also verifies the case status transition from `DRAFT_PRIVATE_COACHING` to `BOTH_PRIVATE_COACHING` and confirms that a consumed invite link cannot be reused.

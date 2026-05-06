### WOR-72: E2E test — solo full flow

Added a comprehensive Playwright end-to-end test (`e2e/wor-72/solo-full-flow.spec.ts`) that exercises the entire solo-mode case lifecycle in a single browser session: case creation with the solo toggle, private coaching for both parties via the party toggle, synthesis verification, joint chat with coach facilitation, Draft Coach drafting and sending, closure proposal and confirmation, and dashboard verification. This is the highest-value smoke test and the primary gate for the "solo mode works end-to-end" launch criterion.

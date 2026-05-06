### WOR-76: E2E test — admin template management

Added a Playwright E2E test covering the full admin template lifecycle:
creating a template, publishing versioned updates (v1 → v2), verifying
that existing cases remain pinned to their original template version, and
archiving a template while confirming pinned cases continue to function.
Also introduced a `callQuery` test fixture and `__TEST_CALL_QUERY__`
browser hook for reading Convex query results from E2E tests.

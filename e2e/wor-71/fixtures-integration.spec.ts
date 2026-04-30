/**
 * WOR-71: E2E test for test fixture helpers.
 *
 * Covers:
 * - AC5: Test fixtures: createTestUser, loginAsUser, createTestCase helpers
 *
 * This test imports the fixture helpers from e2e/fixtures.ts and exercises the
 * full chain: create a test user, authenticate a browser context as that user,
 * create a case, and verify the dashboard shows the created case.
 *
 * These tests will fail until the Convex backend testSupport functions exist
 * and the dev server + Convex are running with CLAUDE_MOCK=true.
 */

import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";

// ---------------------------------------------------------------------------
// AC5: Test fixtures: createTestUser, loginAsUser, createTestCase helpers
// ---------------------------------------------------------------------------

test("Test fixtures: createTestUser creates a user that can be used in tests", async () => {
  // createTestUser should seed a user directly via Convex (not through
  // the UI), returning at minimum { userId, email }.
  const user = await createTestUser({
    email: `test-${Date.now()}@example.com`,
    displayName: "Test User",
  });

  expect(user).toBeDefined();
  expect(user.userId).toBeDefined();
  expect(user.email).toBeDefined();
});

test("Test fixtures: loginAsUser authenticates a Playwright browser context", async ({
  page,
}) => {
  const user = await createTestUser({
    email: `test-login-${Date.now()}@example.com`,
    displayName: "Login Test User",
  });

  // loginAsUser should authenticate the given page/context as the user,
  // bypassing the email/OAuth flow.
  await loginAsUser(page, user);

  // After login, navigating to the dashboard should succeed (not redirect
  // to login).
  await page.goto("/dashboard");
  await expect(page).not.toHaveURL(/\/login/);
});

test("Test fixtures: createTestCase creates a case visible on the dashboard", async ({
  page,
}) => {
  const user = await createTestUser({
    email: `test-case-${Date.now()}@example.com`,
    displayName: "Case Test User",
  });

  await loginAsUser(page, user);

  // createTestCase should create a case via Convex,
  // returning at minimum { caseId }.
  const testCase = await createTestCase({
    initiatorUserId: user.userId,
    category: "workplace",
    mainTopic: "Test conflict topic",
    description: "A test conflict for fixture validation",
    desiredOutcome: "Resolve the test conflict",
    isSolo: true,
  });

  expect(testCase).toBeDefined();
  expect(testCase.caseId).toBeDefined();

  // The case should appear on the dashboard
  await page.goto("/dashboard");
  await expect(page.getByText("Test conflict topic")).toBeVisible({
    timeout: 10_000,
  });
});

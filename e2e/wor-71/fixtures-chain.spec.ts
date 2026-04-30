/**
 * WOR-71 — AC: Test fixtures: createTestUser, loginAsUser, createTestCase helpers
 *
 * This test validates the full fixture chain end-to-end:
 *   1. createTestUser seeds a user directly via Convex (not through the UI)
 *   2. loginAsUser authenticates a Playwright browser context as that user
 *   3. createTestCase creates a case via the cases/create mutation
 *
 * After running the chain, the test asserts the dashboard shows the created case.
 *
 * Today this test FAILS because e2e/fixtures.ts does not exist yet.
 */
import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginAsUser,
  createTestCase,
} from "../fixtures";

test("Test fixtures: createTestUser, loginAsUser, createTestCase helpers", async ({
  page,
}) => {
  // Step 1: createTestUser — seed a user directly via Convex
  const testUser = await createTestUser({
    email: `e2e-user-${Date.now()}@test.conflictcoach.app`,
    displayName: "E2E Test User",
  });
  expect(testUser).toBeDefined();
  expect(testUser.id).toBeDefined();
  expect(testUser.email).toContain("@test.conflictcoach.app");

  // Step 2: loginAsUser — authenticate the Playwright browser context
  await loginAsUser(page, testUser);

  // Verify we're logged in — the dashboard should be visible
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({
    timeout: 10_000,
  });

  // Step 3: createTestCase — create a case via the mutation
  const testCase = await createTestCase({
    userId: testUser.id,
    category: "workplace",
    mainTopic: "E2E fixture test case",
    description: "Created by the fixture chain test to validate helpers.",
    desiredOutcome: "Verify fixture chain works.",
  });
  expect(testCase).toBeDefined();
  expect(testCase.id).toBeDefined();

  // Verify the created case appears on the dashboard
  await page.reload();
  await expect(page.getByText("E2E fixture test case")).toBeVisible({
    timeout: 10_000,
  });
});

test("createTestUser produces distinct users on each call", async () => {
  const user1 = await createTestUser({
    email: `distinct-1-${Date.now()}@test.conflictcoach.app`,
    displayName: "User One",
  });
  const user2 = await createTestUser({
    email: `distinct-2-${Date.now()}@test.conflictcoach.app`,
    displayName: "User Two",
  });

  expect(user1.id).not.toBe(user2.id);
  expect(user1.email).not.toBe(user2.email);
});

test("loginAsUser establishes an authenticated session that persists across navigation", async ({
  page,
}) => {
  const testUser = await createTestUser({
    email: `session-persist-${Date.now()}@test.conflictcoach.app`,
    displayName: "Session Test User",
  });

  await loginAsUser(page, testUser);

  // Navigate away and back — session should persist
  await page.goto("/");
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({
    timeout: 10_000,
  });
});

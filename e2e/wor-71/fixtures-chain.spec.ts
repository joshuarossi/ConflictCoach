import { test, expect } from "@playwright/test";

/**
 * WOR-71 AC: Test fixtures: createTestUser, loginAsUser, createTestCase helpers
 *
 * This E2E test validates the fixture helper chain end-to-end:
 * create a test user, authenticate as that user, create a test case,
 * and verify the dashboard shows the created case.
 */

// @ts-expect-error WOR-71 red-state import: implementation is created by task-implement.
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";

test.describe("AC: Test fixtures work end-to-end", () => {
  test("createTestUser + loginAsUser establishes an authenticated session", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    // After login, the user should be on the dashboard (not the login page)
    await page.goto("/");
    // The dashboard should NOT show a sign-in prompt
    await expect(page.getByText(/sign in/i)).toBeHidden({ timeout: 5000 });
    // Should show dashboard content
    await expect(page.getByText(/dashboard|my cases/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test("createTestCase creates a case visible on the dashboard", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const caseData = await createTestCase(page, user);

    // Navigate to dashboard
    await page.goto("/");

    // The created case should appear on the dashboard
    // Case data should include at minimum a caseId
    expect(caseData).toHaveProperty("caseId");
    expect(typeof caseData.caseId).toBe("string");

    // Dashboard should show the case (by category or topic)
    const caseRow = page.locator(`[data-case-id="${caseData.caseId}"]`);
    await expect(caseRow).toBeVisible({ timeout: 5000 });
  });

  test("createTestCase returns a case in DRAFT_PRIVATE_COACHING status", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const caseData = await createTestCase(page, user);

    expect(caseData).toHaveProperty("status");
    expect(caseData.status).toBe("DRAFT_PRIVATE_COACHING");
  });
});

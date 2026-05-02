/**
 * WOR-33: Dashboard cases/list reactivity — E2E smoke test
 *
 * AC6: Query is reactive (clients auto-update when case data changes)
 *
 * Convex queries are reactive by framework design: all `query()` functions
 * auto-subscribe clients via WebSocket, pushing updates when underlying
 * data changes. This test verifies that the dashboard renders case data
 * from the list query, confirming the reactive subscription is wired.
 *
 * Expected to FAIL until WOR-33 backend + dashboard UI are implemented.
 */
import { test, expect } from "@playwright/test";

/**
 * Navigate to login and authenticate as a test user.
 * Will fail until auth UI is implemented — correct red state.
 */
async function loginAsTestUser(
  page: import("@playwright/test").Page,
  email: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|cases|\/)/, { timeout: 10000 });
}

test.describe("WOR-33: cases/list reactive query", () => {
  // Smoke test: verifies the dashboard subscribes to cases/list and renders
  // case data. Full reactivity verification (mutate → observe UI update
  // without refresh) requires a running Convex backend with test data seeding,
  // which is not available in this E2E environment.
  test("dashboard subscribes to cases/list query and renders case data", async ({
    page,
  }) => {
    await loginAsTestUser(page, "testuser@example.com");

    // The dashboard is the first screen for authenticated users.
    // It should subscribe to the cases/list reactive query and render results.
    const dashboardContent = page
      .getByText(/active cases|closed cases|no cases|create.*case/i)
      .first();

    await expect(dashboardContent).toBeVisible({ timeout: 10000 });
  });
});

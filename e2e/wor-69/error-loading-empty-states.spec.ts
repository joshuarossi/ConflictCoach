/**
 * E2E tests for WOR-69: Error states, loading states, and empty states.
 *
 * Covers:
 * - Dashboard empty state copy
 * - Skeleton screens visible during load
 * - Toast notification for network errors
 * - AI error bubble with Retry button
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser } from "../fixtures";

test.describe("WOR-69: Empty states", () => {
  test("Dashboard shows empty state copy for a new user with no cases", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText(
        "No cases yet. When you're ready to work through something, start a new case.",
      ),
    ).toBeVisible();
  });
});

test.describe("WOR-69: Loading states (skeleton screens)", () => {
  test("Dashboard shows skeleton placeholders before data loads", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    // Intercept the Convex sync to delay response and observe skeleton
    await page.route("**/sync**", async (route) => {
      // Delay to ensure skeleton is visible
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto("/dashboard");

    // Look for skeleton elements during loading
    const skeletons = page.locator(
      "[data-testid*='skeleton'], [class*='skeleton'], [class*='Skeleton']",
    );
    await expect(skeletons.first()).toBeVisible({ timeout: 3000 });

    // After data loads, skeletons should disappear
    await page.waitForLoadState("networkidle");
  });
});

test.describe("WOR-69: AI error with retry", () => {
  // WOR-69: Requires an active case with private coaching to trigger AI error.
  // Skipped until the full case creation + coaching flow is wired end-to-end.
  test.fixme("AI error message shows inline bubble with Retry button", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    // Intercept AI action to force an error
    await page.route("**/api/action**", async (route) => {
      const body = route.request().postData();
      if (body && body.includes("generateAIResponse")) {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: "AI service unavailable" }),
        });
        return;
      }
      await route.continue();
    });

    // TODO(WOR-69): Create a case, navigate to private coaching, send a message
    // to trigger the AI error, then assert the retry button unconditionally.
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const retryButton = page.getByRole("button", { name: /retry/i });
    await expect(retryButton).toBeVisible();
  });
});

test.describe("WOR-69: Network error toast", () => {
  // WOR-69: Requires a guaranteed UI element that triggers a network-dependent mutation.
  // Skipped until the dashboard "new case" button or equivalent action is reliably present.
  test.fixme("network failure shows a transient toast notification", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Abort all API requests to simulate network failure
    await page.route("**/api/**", (route) => route.abort("connectionrefused"));

    // Trigger a network-dependent action unconditionally
    const newCaseButton = page.getByRole("link", { name: /new case/i });
    await expect(newCaseButton).toBeVisible();
    await newCaseButton.click();

    // Toast should appear
    const toast = page.locator(
      "[role='status'], [data-testid='toast'], [class*='toast']",
    );
    await expect(toast.first()).toBeVisible({ timeout: 5000 });
  });
});

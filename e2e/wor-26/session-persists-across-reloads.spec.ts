import { test, expect } from "@playwright/test";

/**
 * AC: Session persists across browser reloads (30-day expiry)
 *
 * This test verifies that after authenticating, a page reload does NOT
 * redirect the user back to a login/landing page — the session persists.
 *
 * The test will fail today because the auth flow (login page, session
 * management) does not exist yet. Once Convex Auth is wired up with
 * session persistence, this test should pass.
 */
test.describe("AC: Session persists across browser reloads (30-day expiry)", () => {
  test("authenticated user remains logged in after a full page reload", async ({
    page,
  }) => {
    // Navigate to the app
    await page.goto("/");

    // The app should have a login mechanism. Look for a login/auth page.
    // After WOR-26 implementation, there should be a way to authenticate.
    // For this test we check that:
    // 1. A login page or auth UI exists
    // 2. After authentication, reload preserves the session

    // First, verify a login UI is present (magic link or Google OAuth button)
    const loginIndicator = page.locator(
      'text=/sign in|log in|magic link|continue with google/i',
    );
    await expect(loginIndicator.first()).toBeVisible({ timeout: 10000 });

    // Attempt magic-link login flow (fill email, submit)
    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="email" i]',
    );
    await expect(emailInput.first()).toBeVisible({ timeout: 5000 });
    await emailInput.first().fill("testuser@example.com");

    // Submit the magic link form
    const submitButton = page.locator(
      'button:has-text("Send"), button:has-text("Sign in"), button:has-text("Continue"), button[type="submit"]',
    );
    await submitButton.first().click();

    // After authentication, the user should see a dashboard or authenticated view
    // (not a login page). This checks for any indicator of logged-in state.
    const authenticatedIndicator = page.locator(
      'text=/dashboard|my cases|log out|new case/i',
    );
    await expect(authenticatedIndicator.first()).toBeVisible({ timeout: 15000 });

    // Now reload the page
    await page.reload();

    // After reload, the user should still be authenticated (not redirected to login)
    await expect(authenticatedIndicator.first()).toBeVisible({ timeout: 10000 });

    // The login page should NOT be showing
    await expect(loginIndicator.first()).not.toBeVisible({ timeout: 3000 });
  });
});

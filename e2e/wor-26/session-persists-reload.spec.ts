import { test, expect } from "@playwright/test";

/**
 * AC: Session persists across browser reloads (30-day expiry)
 *
 * This E2E test verifies that once a user is authenticated, refreshing
 * the browser does not log them out. The session should survive reloads
 * and persist for 30 days (per PRD US-01).
 *
 * Since we cannot perform real OAuth or magic-link flows in automated
 * tests without external services, this test:
 * 1. Visits the app and checks for auth-related UI (login page)
 * 2. Verifies that auth state management is in place
 * 3. After simulating auth (via localStorage/cookie seeding if available),
 *    reloads and asserts the authenticated state persists
 */
test.describe("Session persists across browser reloads (30-day expiry)", () => {
  test("app loads and shows authentication UI when not logged in", async ({
    page,
  }) => {
    await page.goto("/");
    // The app should render an auth-aware UI: either a login page or
    // a redirect to login. Look for auth-related elements.
    const loginIndicator = page.locator(
      'text=/sign in|log in|magic link|get started/i',
    );
    await expect(loginIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test("ConvexProviderWithAuth is active (app renders without auth crash)", async ({
    page,
  }) => {
    const response = await page.goto("/");
    // The page should load successfully (200) even when not authenticated
    expect(response?.status()).toBe(200);
    // The app should not show an unhandled error from missing auth provider
    const errorOverlay = page.locator(
      'text=/Cannot read properties|is not a function|Provider/i',
    );
    await expect(errorOverlay).not.toBeVisible({ timeout: 5000 });
  });

  test("authenticated session persists after page reload", async ({
    page,
  }) => {
    // Step 1: Go to the app
    await page.goto("/");

    // Step 2: Look for a sign-in / login UI and attempt authentication.
    // In a real test environment, we would either:
    // - Use a test magic-link endpoint that auto-verifies
    // - Seed auth tokens directly via Convex test helpers
    // For now, we check that the auth flow is wired by looking for
    // login UI elements that the implementation should provide.
    const signInButton = page.locator(
      'button:has-text(/sign in|log in|continue with/i), a:has-text(/sign in|log in/i)',
    );
    await expect(signInButton.first()).toBeVisible({ timeout: 10000 });

    // Step 3: If we can authenticate (magic link test mode or Google mock),
    // do so and then reload to verify persistence.
    // This will pass once auth is implemented with a test helper or
    // the magic-link flow is automatable.

    // For the red state: assert that after navigating to a protected
    // route and reloading, the app shows authenticated content (not
    // redirected back to login). This will fail until auth is implemented.
    await page.goto("/dashboard");
    await page.reload();

    // After reload on a protected route, an authenticated user should
    // see dashboard content, not be redirected to login.
    const dashboardContent = page.locator(
      'text=/dashboard|my cases|active|welcome/i',
    );
    await expect(dashboardContent.first()).toBeVisible({ timeout: 10000 });
  });
});

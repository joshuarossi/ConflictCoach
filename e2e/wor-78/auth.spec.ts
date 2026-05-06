/**
 * WOR-78: E2E auth flow tests
 *
 * AC 1: Test registers a new user via magic link with mocked email capture
 * AC 2: Verifies user record is created in the database
 * AC 3: Logs out and verifies session is cleared, redirects to login
 * AC 4: Logs back in via magic link and verifies session restoration
 * AC 5: Verifies Google OAuth flow (mocked provider)
 * AC 6: Verifies session persists across browser reload
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser } from "../fixtures";

/**
 * Helper: fill email on /login and click "Send magic link", then capture
 * the magic link token via the test email capture hook.
 *
 * Returns the captured token string. Throws if the test hook is missing
 * (red-state until the magic-link capture shim is implemented).
 */
async function requestAndCaptureMagicLink(
  page: import("@playwright/test").Page,
  email: string,
): Promise<string> {
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole("button", { name: /magic link/i }).click();

  // Confirmation UI should appear after sending
  await expect(page.getByText(/check your email|link sent|magic link sent/i)).toBeVisible();

  // Capture token from the mocked email system (CLAUDE_MOCK=true)
  const token = await page.evaluate(async () => {
    const w = window as unknown as {
      __TEST_CAPTURE_MAGIC_LINK_TOKEN__?: () => Promise<string>;
    };
    if (!w.__TEST_CAPTURE_MAGIC_LINK_TOKEN__) {
      throw new Error(
        "Test hook __TEST_CAPTURE_MAGIC_LINK_TOKEN__ not found. " +
          "Ensure CLAUDE_MOCK=true and the magic link capture shim is mounted.",
      );
    }
    return w.__TEST_CAPTURE_MAGIC_LINK_TOKEN__();
  });

  return token;
}

/**
 * Helper: follow a captured magic link token to complete authentication.
 */
async function followMagicLink(
  page: import("@playwright/test").Page,
  token: string,
): Promise<void> {
  await page.goto(`/auth/magic-link?token=${encodeURIComponent(token)}`);
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
}

test.describe("WOR-78: Auth lifecycle", () => {
  // ── AC 1: Magic link registration ────────────────────────────────────
  test("registers a new user via magic link with mocked email capture", async ({
    page,
  }) => {
    const testEmail = `e2e-magic-${Date.now()}@test.local`;

    await page.goto("/login");

    const token = await requestAndCaptureMagicLink(page, testEmail);
    expect(token).toBeTruthy();

    await followMagicLink(page, token);

    // User lands on /dashboard after successful registration
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // ── AC 2: User record created in database ────────────────────────────
  test("verifies user record is created in the database after registration", async ({
    page,
  }) => {
    const testEmail = `e2e-record-${Date.now()}@test.local`;

    await page.goto("/login");
    const token = await requestAndCaptureMagicLink(page, testEmail);
    await followMagicLink(page, token);

    // Query the users table via test hook to confirm the row exists
    const userRecord = await page.evaluate(async (email: string) => {
      const w = window as unknown as {
        __TEST_QUERY_USER__?: (
          email: string,
        ) => Promise<{ email: string; role: string } | null>;
      };
      if (!w.__TEST_QUERY_USER__) {
        throw new Error(
          "Test hook __TEST_QUERY_USER__ not found. " +
            "Ensure CLAUDE_MOCK=true and the user-query shim is mounted.",
        );
      }
      return w.__TEST_QUERY_USER__(email);
    }, testEmail);

    expect(userRecord).not.toBeNull();
    expect(userRecord?.email).toBe(testEmail);
    expect(userRecord?.role).toBe("USER");
  });

  // ── AC 3: Logout clears session, redirects to /login ─────────────────
  test("logs out and verifies session is cleared, redirects to login", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    // Confirm we start on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Open user menu and click logout
    await page.getByRole("button", { name: /user menu|account|profile/i }).click();
    await page.getByRole("menuitem", { name: /log\s?out|sign\s?out/i }).click();

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);

    // Navigating to a protected route should bounce back to /login
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  // ── AC 4: Re-login via magic link restores session ───────────────────
  test("logs back in via magic link and verifies session restoration", async ({
    page,
  }) => {
    const testEmail = `e2e-relogin-${Date.now()}@test.local`;

    // Register via magic link
    await page.goto("/login");
    const firstToken = await requestAndCaptureMagicLink(page, testEmail);
    await followMagicLink(page, firstToken);
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout
    await page.getByRole("button", { name: /user menu|account|profile/i }).click();
    await page.getByRole("menuitem", { name: /log\s?out|sign\s?out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Re-login with same email via magic link
    const secondToken = await requestAndCaptureMagicLink(page, testEmail);
    await followMagicLink(page, secondToken);
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify no duplicate user record — should still be exactly 1 row
    const userCount = await page.evaluate(async (email: string) => {
      const w = window as unknown as {
        __TEST_COUNT_USERS_BY_EMAIL__?: (email: string) => Promise<number>;
      };
      if (!w.__TEST_COUNT_USERS_BY_EMAIL__) {
        throw new Error(
          "Test hook __TEST_COUNT_USERS_BY_EMAIL__ not found. " +
            "Ensure CLAUDE_MOCK=true and the user-count shim is mounted.",
        );
      }
      return w.__TEST_COUNT_USERS_BY_EMAIL__(email);
    }, testEmail);

    expect(userCount).toBe(1);
  });

  // ── AC 5: Google OAuth flow (mocked provider) ────────────────────────
  test("verifies Google OAuth flow with mocked provider", async ({ page }) => {
    await page.goto("/login");

    // Click "Continue with Google" — in test mode (CLAUDE_MOCK=true) the
    // mocked OAuth provider should return a deterministic identity without
    // hitting Google servers.
    await page.getByRole("button", { name: /continue with google/i }).click();

    // Should end up on /dashboard after mocked OAuth completes
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // Verify user record was created from the OAuth identity
    const userRecord = await page.evaluate(async () => {
      const w = window as unknown as {
        __TEST_GET_CURRENT_USER__?: () => Promise<{
          email: string;
          role: string;
        } | null>;
      };
      if (!w.__TEST_GET_CURRENT_USER__) {
        throw new Error(
          "Test hook __TEST_GET_CURRENT_USER__ not found. " +
            "Ensure CLAUDE_MOCK=true and the current-user shim is mounted.",
        );
      }
      return w.__TEST_GET_CURRENT_USER__();
    });

    expect(userRecord).not.toBeNull();
    expect(userRecord?.role).toBe("USER");
    expect(userRecord?.email).toBeTruthy();
  });

  // ── AC 6: Session persists across browser reload ─────────────────────
  test("verifies session persists across browser reload", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    // Confirm we are on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

    // Reload the page
    await page.reload();

    // Should remain on the dashboard — not redirected to /login
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });
});

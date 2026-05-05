/**
 * WOR-32: Login / Register page E2E tests
 *
 * AC: Login page renders a centered 400px card
 * AC: Email input + 'Send magic link' primary button
 * AC: 'Continue with Google' secondary button
 * AC: No password field
 * AC: Fine print with Terms and Privacy Policy links
 * AC: Successful auth redirects to /dashboard
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser } from "../fixtures";

test.describe("WOR-32: Login page", () => {
  test("login page renders with email input and magic link button", async ({
    page,
  }) => {
    await page.goto("/login");

    // Email input is visible
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // Send magic link button is visible
    await expect(
      page.getByRole("button", { name: /magic link/i }),
    ).toBeVisible();
  });

  test("login page renders Continue with Google button", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("button", { name: /continue with google/i }),
    ).toBeVisible();
  });

  test("login page has no password field", async ({ page }) => {
    await page.goto("/login");

    const passwordInputs = page.locator('input[type="password"]');
    await expect(passwordInputs).toHaveCount(0);
  });

  test("login page displays fine print with Terms and Privacy links", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page.getByText(/by signing in.*agree/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /terms/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /privacy/i })).toBeVisible();
  });

  test("successful auth redirects to /dashboard", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    // After login, the user should end up on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

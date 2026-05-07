/**
 * WOR-83: E2E tests for the /profile route.
 *
 * Covers AC1 (route registered under AuthGuard + ReadingLayout),
 * AC2 (unauthenticated redirect to /login),
 * AC8 (TopNav UserMenu "Profile" link navigates to /profile).
 *
 * Red-state expectation: AC1 fails because /profile is not registered —
 * the URL falls through to 404 or redirects away. AC2 may pass vacuously
 * (no route = no page) but for the wrong reason. AC8 fails because
 * data-testid="profile-link" does not exist in the UserMenu dropdown.
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser } from "../fixtures";

test.describe("WOR-83: /profile route", () => {
  test("AC1: navigating to /profile while logged in renders the Profile page", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/profile/);
    await expect(
      page.getByRole("heading", { name: /profile/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("AC2: unauthenticated user is redirected to /login", async ({
    page,
  }) => {
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("AC8: TopNav UserMenu dropdown includes a Profile link to /profile", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Open the user menu dropdown
    const userMenuButton = page.locator(
      "[data-testid='user-menu-button']",
    );
    await expect(userMenuButton).toBeVisible({ timeout: 10_000 });
    await userMenuButton.click();

    // Assert Profile link is visible
    const profileLink = page.locator("[data-testid='profile-link']");
    await expect(profileLink).toBeVisible({ timeout: 5_000 });

    // Click the Profile link and verify navigation
    await profileLink.click();
    await expect(page).toHaveURL(/\/profile/, { timeout: 10_000 });
    await expect(
      page.getByRole("heading", { name: /profile/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

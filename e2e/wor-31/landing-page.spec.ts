/**
 * WOR-31: Landing page — E2E tests
 *
 * AC1: Landing page renders at / for logged-out users
 * AC6: Primary CTA "Start a case" routes to /login
 * AC7: Logged-in users are redirected to /dashboard
 *
 * Expected to FAIL until the full LandingPage implementation and
 * auth redirect logic are wired.
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser } from "../fixtures";

test.describe("WOR-31: Landing page", () => {
  // ── AC1: Landing page renders at / for logged-out users ─────────────
  test("AC1: logged-out visitor sees the landing page at /", async ({
    page,
  }) => {
    await page.goto("/");

    // The hero tagline should be visible to a logged-out visitor
    await expect(
      page.getByText(
        "A calm place to work through a difficult conversation.",
      ),
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── AC6: Primary CTA routes to /login ───────────────────────────────
  test('AC6: clicking "Start a case" navigates to /login', async ({
    page,
  }) => {
    await page.goto("/");

    const cta = page.getByRole("link", { name: /Start a case/i });
    await expect(cta).toBeVisible();
    await cta.click();

    await page.waitForURL("**/login", { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  // ── AC7: Logged-in users redirected to /dashboard ───────────────────
  test("AC7: authenticated user visiting / is redirected to /dashboard", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    // Now navigate explicitly to the landing page root
    await page.goto("/");

    // Should redirect away from / to /dashboard
    await page.waitForURL("**/dashboard", { timeout: 10_000 });
    expect(page.url()).toContain("/dashboard");
  });
});

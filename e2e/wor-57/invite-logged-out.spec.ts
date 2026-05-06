/**
 * WOR-57: Invite acceptance — Logged-out E2E (AC1, AC2)
 *
 * AC1: Logged-out view shows centered card with initiator name,
 *      product explanation, and "Sign in to continue" button.
 * AC2: Token survives the auth flow (stashed and restored).
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser } from "../fixtures";

test.describe("WOR-57: Invite page — logged-out", () => {
  const VALID_TOKEN = "e2e-test-invite-token-placeholder";

  test("AC1: logged-out visitor sees invite card with initiator name and sign-in button", async ({
    page,
  }) => {
    await page.goto(`/invite/${VALID_TOKEN}`);

    // Should see the invitation message with the initiator's name
    await expect(
      page.getByText(/has invited you to work through something together/i),
    ).toBeVisible({ timeout: 10_000 });

    // Should see a sign-in CTA
    await expect(
      page.getByRole("button", { name: /sign in to continue/i }),
    ).toBeVisible();
  });

  test("AC1: no private data (description, desiredOutcome) is visible to logged-out user", async ({
    page,
  }) => {
    await page.goto(`/invite/${VALID_TOKEN}`);

    // Wait for page to load
    await expect(
      page.getByText(/has invited you to work through something together/i),
    ).toBeVisible({ timeout: 10_000 });

    // description and desiredOutcome must not appear
    await expect(page.locator("text=desiredOutcome")).not.toBeVisible();
  });

  test("AC2: token survives auth redirect and user lands back on invite page", async ({
    page,
  }) => {
    // Start at the invite page logged out
    await page.goto(`/invite/${VALID_TOKEN}`);

    await expect(
      page.getByRole("button", { name: /sign in to continue/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Click sign in — should stash the token
    await page.getByRole("button", { name: /sign in to continue/i }).click();

    // Now log in via the test fixture
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    // After auth, should be redirected back to the invite page with token
    await page.waitForURL(`**/invite/${VALID_TOKEN}`, { timeout: 15_000 });
    expect(page.url()).toContain(`/invite/${VALID_TOKEN}`);
  });
});

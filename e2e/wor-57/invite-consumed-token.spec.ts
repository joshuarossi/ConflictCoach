/**
 * WOR-57: Invite acceptance — Consumed/invalid token E2E (AC7)
 *
 * AC7: Already-consumed token shows clear error with "Log in" and
 *      "Go to dashboard" options. No accept/decline buttons visible.
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser } from "../fixtures";

test.describe("WOR-57: Consumed/invalid token", () => {
  const CONSUMED_TOKEN = "e2e-consumed-token-placeholder";

  test("AC7: consumed token shows error message", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto(`/invite/${CONSUMED_TOKEN}`);

    await expect(
      page.getByText(/already been used|invalid|expired|no longer valid/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('AC7: error state shows "Log in" link', async ({ page }) => {
    await page.goto(`/invite/${CONSUMED_TOKEN}`);

    await expect(page.getByRole("link", { name: /log in/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test('AC7: error state shows "Go to dashboard" link', async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto(`/invite/${CONSUMED_TOKEN}`);

    await expect(
      page.getByRole("link", { name: /go to dashboard/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("AC7: no Accept or Decline buttons visible for consumed token", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto(`/invite/${CONSUMED_TOKEN}`);

    // Wait for error state to render
    await expect(
      page.getByText(/already been used|invalid|expired|no longer valid/i),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByRole("button", { name: /accept/i }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /decline/i }),
    ).not.toBeVisible();
  });
});

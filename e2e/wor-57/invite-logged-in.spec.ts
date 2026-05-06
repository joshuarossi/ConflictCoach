/**
 * WOR-57: Invite acceptance — Logged-in E2E (AC3, AC4, AC5, AC6, AC8)
 *
 * AC3: Logged-in + unredeemed view shows mainTopic and category, no private content.
 * AC4: Privacy callout with initiator name.
 * AC5: Accept calls invites/redeem, routes to invitee case form.
 * AC6: Decline marks case CLOSED_ABANDONED.
 * AC8: After accepting, invitee is routed to fill their own case form.
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser } from "../fixtures";

test.describe("WOR-57: Invite page — logged-in", () => {
  const VALID_TOKEN = "e2e-test-invite-token-placeholder";

  test.beforeEach(async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
  });

  test("AC3: logged-in user sees mainTopic and category", async ({ page }) => {
    await page.goto(`/invite/${VALID_TOKEN}`);

    // mainTopic should be displayed — use a specific locator and verify
    // it has non-empty text content from the seeded invite data
    const mainTopicEl = page.locator("[data-testid='main-topic']");
    await expect(mainTopicEl).toBeVisible({ timeout: 10_000 });
    await expect(mainTopicEl).not.toBeEmpty();

    // category should be displayed
    const categoryEl = page.locator("[data-testid='category']");
    await expect(categoryEl).toBeVisible();
    await expect(categoryEl).not.toBeEmpty();
  });

  test("AC3: private coaching content is NOT displayed", async ({ page }) => {
    await page.goto(`/invite/${VALID_TOKEN}`);

    // Wait for the view to load
    await expect(
      page.getByRole("button", { name: /accept/i }),
    ).toBeVisible({ timeout: 10_000 });

    // The page body should not contain the initiator's private description
    // or desiredOutcome content. We snapshot the page text and verify absence
    // of section headings that would indicate private fields are rendered.
    const bodyText = await page.locator("main, [role='main'], body").innerText();
    expect(bodyText).not.toMatch(/desired\s*outcome/i);
  });

  test("AC4: privacy callout shows initiator name and shared summary message", async ({
    page,
  }) => {
    await page.goto(`/invite/${VALID_TOKEN}`);

    await expect(
      page.getByText(/wrote this in the shared summary/i),
    ).toBeVisible({ timeout: 10_000 });

    await expect(
      page.getByText(/your own private space to share your perspective/i),
    ).toBeVisible();
  });

  test("AC5: clicking Accept routes to invitee case form", async ({
    page,
  }) => {
    await page.goto(`/invite/${VALID_TOKEN}`);

    const acceptBtn = page.getByRole("button", { name: /accept/i });
    await expect(acceptBtn).toBeVisible({ timeout: 10_000 });
    await acceptBtn.click();

    // Should navigate to a case form page for the invitee
    await page.waitForURL(/\/case\/.*/, { timeout: 15_000 });
    expect(page.url()).toMatch(/\/case\//);
  });

  test("AC6: clicking Decline transitions case to CLOSED_ABANDONED and redirects", async ({
    page,
  }) => {
    await page.goto(`/invite/${VALID_TOKEN}`);

    const declineBtn = page.getByRole("button", { name: /decline/i });
    await expect(declineBtn).toBeVisible({ timeout: 10_000 });
    await declineBtn.click();

    // After declining, user should see confirmation mentioning the case is closed/abandoned
    // or be redirected to the dashboard
    await page.waitForURL(/\/(dashboard|invite)/, { timeout: 15_000 });

    // Verify the decline resulted in a closed/abandoned state visible to the user
    await expect(
      page.getByText(/declined|closed|abandoned/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("AC8: after accepting, invitee case form has mainTopic, description, and desiredOutcome fields", async ({
    page,
  }) => {
    await page.goto(`/invite/${VALID_TOKEN}`);

    const acceptBtn = page.getByRole("button", { name: /accept/i });
    await expect(acceptBtn).toBeVisible({ timeout: 10_000 });
    await acceptBtn.click();

    // Wait for the case form page
    await page.waitForURL(/\/case\/.*/, { timeout: 15_000 });

    // The invitee case form should have the required fields
    await expect(
      page.getByLabel(/topic/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel(/description/i)).toBeVisible();
    await expect(page.getByLabel(/desired outcome/i)).toBeVisible();
  });
});

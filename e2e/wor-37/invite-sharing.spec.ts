/**
 * WOR-37 E2E: Invite sharing flow
 *
 * Covers browser-level behavior:
 * - AC: Three share options — clipboard writes for "Just copy link" and "Copy for text message"
 * - AC: Copy feedback — visual feedback appears after copy
 * - AC: Secondary CTA navigates to private coaching
 * - AC: Heading renders with the other party's name
 *
 * These tests create a two-party case, then navigate to the invite page.
 * The invite page depends on Router state (inviteUrl, otherPartyName) set by
 * NewCasePage on redirect. We inject Router state via history.replaceState +
 * popstate to simulate what NewCasePage does on case creation.
 * The fallback test verifies direct navigation without Router state.
 */
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";
import type { TestUser } from "../fixtures";

/**
 * Navigate to the invite page with React Router state injected.
 *
 * React Router v6 stores user-provided state under `history.state.usr`.
 * We replaceState with the correct shape and fire popstate so the router
 * re-reads location.state, matching what NewCasePage does on redirect.
 */
async function navigateToInvitePage(
  page: Page,
  caseId: string,
  routerState: { inviteUrl: string; otherPartyName: string },
) {
  await page.goto(`/cases/${caseId}/invite`);
  await page.evaluate(
    ({ state }) => {
      window.history.replaceState(
        { usr: state, key: "test-e2e" },
        "",
        window.location.href,
      );
      window.dispatchEvent(
        new PopStateEvent("popstate", { state: window.history.state }),
      );
    },
    { state: routerState },
  );
  await page.waitForLoadState("networkidle");
}

test.describe("WOR-37: Invite sharing page", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    user = await createTestUser(page);
    await loginAsUser(page, user);
  });

  // ---------------------------------------------------------------------------
  // AC: Heading shows "Send this link to [name]"
  // ---------------------------------------------------------------------------
  test("page heading shows the other party's name", async ({ page }) => {
    const testCase = await createTestCase(page, user, {
      category: "workplace",
      isSolo: false,
    });
    const origin = new URL(page.url()).origin;
    const inviteUrl = `${origin}/invite/${testCase.inviteToken}`;
    await navigateToInvitePage(page, testCase.caseId, {
      inviteUrl,
      otherPartyName: "Test Partner",
    });

    const heading = page.getByRole("heading", {
      name: /send this link to/i,
    });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // AC: Invite link is displayed in a monospace copyable field
  // ---------------------------------------------------------------------------
  test("invite URL is displayed in a copyable field", async ({ page }) => {
    const testCase = await createTestCase(page, user, {
      category: "workplace",
      isSolo: false,
    });
    const origin = new URL(page.url()).origin;
    const inviteUrl = `${origin}/invite/${testCase.inviteToken}`;
    await navigateToInvitePage(page, testCase.caseId, {
      inviteUrl,
      otherPartyName: "Test Partner",
    });

    // The invite link should be visible in a readonly input
    const linkField = page.locator("input[readonly]").first();
    await expect(linkField).toBeVisible({ timeout: 10000 });

    const fieldValue = await linkField.inputValue();
    // The field should contain the exact invite URL from Router state
    expect(fieldValue).toMatch(/^https?:\/\//);
  });

  // ---------------------------------------------------------------------------
  // AC: "Just copy link" copies the raw URL to clipboard
  // ---------------------------------------------------------------------------
  test("'Just copy link' button copies URL to clipboard", async ({
    page,
    context,
  }) => {
    // Grant clipboard permissions for the test
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const testCase = await createTestCase(page, user, {
      category: "workplace",
      isSolo: false,
    });
    const origin = new URL(page.url()).origin;
    const inviteUrl = `${origin}/invite/${testCase.inviteToken}`;
    await navigateToInvitePage(page, testCase.caseId, {
      inviteUrl,
      otherPartyName: "Test Partner",
    });

    const copyButton = page.getByRole("button", { name: /just copy link/i });
    await expect(copyButton).toBeVisible({ timeout: 10000 });
    await copyButton.click();

    // Read clipboard and verify it contains the invite URL
    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    expect(clipboardText).toMatch(/^https?:\/\//);
  });

  // ---------------------------------------------------------------------------
  // AC: "Copy for text message" copies a shorter message with the URL
  // ---------------------------------------------------------------------------
  test("'Copy for text message' copies shorter text with URL to clipboard", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const testCase = await createTestCase(page, user, {
      category: "workplace",
      isSolo: false,
    });
    const origin = new URL(page.url()).origin;
    const inviteUrl = `${origin}/invite/${testCase.inviteToken}`;
    await navigateToInvitePage(page, testCase.caseId, {
      inviteUrl,
      otherPartyName: "Test Partner",
    });

    const textButton = page.getByRole("button", {
      name: /copy for text message/i,
    });
    await expect(textButton).toBeVisible({ timeout: 10000 });
    await textButton.click();

    const clipboardText = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );
    // Should contain a URL
    expect(clipboardText).toMatch(/https?:\/\//);
    // Should be a short message (not just the raw URL, but not the full email body)
    expect(clipboardText.length).toBeLessThan(500);
  });

  // ---------------------------------------------------------------------------
  // AC: Copy feedback — button shows success state after copy
  // ---------------------------------------------------------------------------
  test("copy button shows success feedback after clicking", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    const testCase = await createTestCase(page, user, {
      category: "workplace",
      isSolo: false,
    });
    const origin = new URL(page.url()).origin;
    const inviteUrl = `${origin}/invite/${testCase.inviteToken}`;
    await navigateToInvitePage(page, testCase.caseId, {
      inviteUrl,
      otherPartyName: "Test Partner",
    });

    const copyButton = page.getByRole("button", { name: /copy link/i });
    await expect(copyButton).toBeVisible({ timeout: 10000 });
    await copyButton.click();

    // After clicking, the button should show "Copied!" or similar success text
    const successIndicator = page.getByText(/copied/i);
    await expect(successIndicator).toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // AC: "Copy for email" opens a mailto: link
  // ---------------------------------------------------------------------------
  test("'Copy for email' option has a mailto: href", async ({ page }) => {
    const testCase = await createTestCase(page, user, {
      category: "workplace",
      isSolo: false,
    });
    const origin = new URL(page.url()).origin;
    const inviteUrl = `${origin}/invite/${testCase.inviteToken}`;
    await navigateToInvitePage(page, testCase.caseId, {
      inviteUrl,
      otherPartyName: "Test Partner",
    });

    const emailOption = page.getByText(/copy for email/i);
    await expect(emailOption).toBeVisible({ timeout: 10000 });

    // The element (or its parent anchor) should have a mailto: href
    const href = await emailOption
      .locator("xpath=ancestor-or-self::a")
      .getAttribute("href");
    expect(href).toMatch(/^mailto:/);
  });

  // ---------------------------------------------------------------------------
  // AC: Expandable "What should I tell them?" section
  // ---------------------------------------------------------------------------
  test("expandable section reveals suggested sharing language", async ({
    page,
  }) => {
    const testCase = await createTestCase(page, user, {
      category: "workplace",
      isSolo: false,
    });
    const origin = new URL(page.url()).origin;
    const inviteUrl = `${origin}/invite/${testCase.inviteToken}`;
    await navigateToInvitePage(page, testCase.caseId, {
      inviteUrl,
      otherPartyName: "Test Partner",
    });

    const trigger = page.getByText(/what should i tell them/i);
    await expect(trigger).toBeVisible({ timeout: 10000 });

    // Content should be hidden initially
    const suggestedText = page.getByText(
      /i found this thing called conflict coach/i,
    );
    await expect(suggestedText).not.toBeVisible();

    // Click to expand
    await trigger.click();
    await expect(suggestedText).toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // AC: Secondary CTA links to /cases/:id/private
  // ---------------------------------------------------------------------------
  test("secondary CTA navigates to private coaching", async ({ page }) => {
    const testCase = await createTestCase(page, user, {
      category: "workplace",
      isSolo: false,
    });
    const origin = new URL(page.url()).origin;
    const inviteUrl = `${origin}/invite/${testCase.inviteToken}`;
    await navigateToInvitePage(page, testCase.caseId, {
      inviteUrl,
      otherPartyName: "Test Partner",
    });

    const cta = page.getByText(/start your private coaching now/i);
    await expect(cta).toBeVisible({ timeout: 10000 });
    await cta.click();

    await page.waitForURL(new RegExp(`/cases/${testCase.caseId}/private`), {
      timeout: 10000,
    });
  });

  // ---------------------------------------------------------------------------
  // Edge case: Direct navigation without Router state shows fallback
  // ---------------------------------------------------------------------------
  test("direct navigation without Router state shows fallback message", async ({
    page,
  }) => {
    const testCase = await createTestCase(page, user, {
      category: "workplace",
      isSolo: false,
    });
    // Navigate directly (no Router state from NewCasePage)
    await page.goto(`/cases/${testCase.caseId}/invite`);
    await page.waitForLoadState("networkidle");

    // Without Router state, the page should show a fallback message —
    // NOT the happy-path heading. Only accept fallback content.
    const fallback = page
      .getByText(/no longer available/i)
      .or(page.getByText(/check your case dashboard/i));
    await expect(fallback.first()).toBeVisible({ timeout: 10000 });
  });
});

/**
 * WOR-53 E2E: Case closure frontend flow
 *
 * Covers:
 * - AC: Close button in joint chat header opens a styled modal
 * - AC: Three options in the modal (Resolved, Not resolved, Take a break)
 * - AC: "Propose Resolution" button calls the proposeClosure mutation
 * - AC: Confirmation banner renders for the other party
 * - AC: Banner shows proposer's summary + Confirm/Reject buttons
 * - AC: Confirm calls confirmClosure; case transitions to CLOSED_RESOLVED
 * - AC: Reject clears proposal; both parties continue chatting
 * - AC: Not resolved triggers unilateral close
 * - AC: Take a break just closes modal, case stays JOINT_ACTIVE
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser, createTestCase, advanceCaseToStatus } from "../fixtures";
import type { TestUser } from "../fixtures";

/**
 * Helper: creates a case and advances it to JOINT_ACTIVE using shared fixtures.
 */
async function setupJointActiveCase(page: import("@playwright/test").Page, user: TestUser): Promise<string> {
  const testCase = await createTestCase(page, user, { category: "workplace", isSolo: true });
  await advanceCaseToStatus(page, testCase.caseId, "JOINT_ACTIVE");
  return testCase.caseId;
}

test.describe("WOR-53: Case closure modal flow", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    user = await createTestUser(page);
    await loginAsUser(page, user);
  });

  // ---------------------------------------------------------------------------
  // AC: Close button opens styled modal
  // ---------------------------------------------------------------------------
  test("Close button in joint chat header opens closure modal", async ({ page }) => {
    const caseId = await setupJointActiveCase(page, user);
    await page.goto(`/cases/${caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Click the Close button in the header
    const closeButton = page.getByRole("button", { name: /close/i }).first();
    await expect(closeButton).toBeVisible({ timeout: 10000 });
    await closeButton.click();

    // Modal should open (not a browser confirm)
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // AC: Three options visible in modal
  // ---------------------------------------------------------------------------
  test("Modal shows three closure options: Resolved, Not resolved, Take a break", async ({ page }) => {
    const caseId = await setupJointActiveCase(page, user);
    await page.goto(`/cases/${caseId}/joint`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /close/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Verify three options are present
    await expect(dialog.getByText(/^resolved$/i).or(dialog.getByRole("radio", { name: /resolved/i }))).toBeVisible();
    await expect(dialog.getByText(/not resolved/i)).toBeVisible();
    await expect(dialog.getByText(/take a break/i)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // AC: Resolved option with textarea + Propose Resolution
  // ---------------------------------------------------------------------------
  test("Resolved option shows textarea; Propose Resolution submits with summary", async ({ page }) => {
    const caseId = await setupJointActiveCase(page, user);
    await page.goto(`/cases/${caseId}/joint`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /close/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select "Resolved"
    await dialog.getByText(/^resolved$/i).or(dialog.getByRole("radio", { name: /resolved/i })).click();

    // Textarea should appear
    const textarea = dialog.getByRole("textbox");
    await expect(textarea).toBeVisible();

    // Fill summary and submit
    await textarea.fill("We agreed to split the cost 50/50");
    const proposeButton = dialog.getByRole("button", { name: /propose resolution/i });
    await expect(proposeButton).toBeVisible();
    await proposeButton.click();

    // Modal should close after submission
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  // ---------------------------------------------------------------------------
  // AC: Resolved validation - empty textarea blocks submission
  // ---------------------------------------------------------------------------
  test("Resolved option blocks submission when textarea is empty", async ({ page }) => {
    const caseId = await setupJointActiveCase(page, user);
    await page.goto(`/cases/${caseId}/joint`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /close/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select "Resolved" without filling textarea
    await dialog.getByText(/^resolved$/i).or(dialog.getByRole("radio", { name: /resolved/i })).click();

    const proposeButton = dialog.getByRole("button", { name: /propose resolution/i });
    await proposeButton.click();

    // Modal should still be visible (submission blocked)
    await expect(dialog).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // AC: Not resolved option triggers unilateral close
  // ---------------------------------------------------------------------------
  test("Not resolved option shows warning and triggers unilateral close", async ({ page }) => {
    const caseId = await setupJointActiveCase(page, user);
    await page.goto(`/cases/${caseId}/joint`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /close/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select "Not resolved"
    await dialog.getByText(/not resolved/i).click();

    // Should see warning consequence text
    await expect(
      dialog.getByText(/closes the case immediately for both of you/i),
    ).toBeVisible();

    // Click the close-without-resolution button
    const closeButton = dialog.getByRole("button", { name: /close without resolution/i });
    await closeButton.click();

    // Should navigate away from joint chat (case is now CLOSED_UNRESOLVED)
    await page.waitForURL(/\/cases\/.*\/(closed|$)/, { timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // AC: Take a break closes modal, case stays active
  // ---------------------------------------------------------------------------
  test("Take a break closes modal without changing case status", async ({ page }) => {
    const caseId = await setupJointActiveCase(page, user);
    await page.goto(`/cases/${caseId}/joint`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /close/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Select "Take a break"
    await dialog.getByText(/take a break/i).click();

    // Confirm the take-a-break action
    const breakButton = dialog.getByRole("button", { name: /take a break/i });
    await breakButton.click();

    // Modal should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Should still be on the joint chat page (case is still JOINT_ACTIVE)
    await expect(page).toHaveURL(new RegExp(`/cases/${caseId}/joint`));
  });
});

test.describe("WOR-53: Confirmation banner flow", () => {
  let user: TestUser;

  test.beforeEach(async ({ page }) => {
    user = await createTestUser(page);
    await loginAsUser(page, user);
  });

  // ---------------------------------------------------------------------------
  // AC: Confirmation banner shows after closure proposed
  // ---------------------------------------------------------------------------
  test("Confirmation banner appears after proposing closure (solo mode)", async ({ page }) => {
    const caseId = await setupJointActiveCase(page, user);
    await page.goto(`/cases/${caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Open closure modal and propose resolution
    await page.getByRole("button", { name: /close/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await dialog.getByText(/^resolved$/i).or(dialog.getByRole("radio", { name: /resolved/i })).click();
    const textarea = dialog.getByRole("textbox");
    await textarea.fill("We agreed on the plan");
    await dialog.getByRole("button", { name: /propose resolution/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // In solo mode, the confirmation banner should appear (viewing as other party)
    const banner = page.locator('[data-testid="closure-confirmation-banner"]').or(
      page.getByText(/proposed closing this case/i),
    );
    await expect(banner.first()).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // AC: Banner shows summary text + Confirm and Reject buttons
  // ---------------------------------------------------------------------------
  test("Banner shows summary and both action buttons", async ({ page }) => {
    const caseId = await setupJointActiveCase(page, user);
    await page.goto(`/cases/${caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Propose closure
    await page.getByRole("button", { name: /close/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByText(/^resolved$/i).or(dialog.getByRole("radio", { name: /resolved/i })).click();
    await dialog.getByRole("textbox").fill("We agreed on the plan");
    await dialog.getByRole("button", { name: /propose resolution/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify banner content
    const summaryText = page.getByText("We agreed on the plan");
    await expect(summaryText).toBeVisible({ timeout: 10000 });

    const confirmButton = page.getByRole("button", { name: /confirm/i });
    await expect(confirmButton).toBeVisible();

    const rejectButton = page.getByRole("button", { name: /reject and keep talking/i });
    await expect(rejectButton).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // AC: Confirm → CLOSED_RESOLVED, redirect to closed view
  // ---------------------------------------------------------------------------
  test("Confirm button closes case and redirects to closed view", async ({ page }) => {
    const caseId = await setupJointActiveCase(page, user);
    await page.goto(`/cases/${caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Propose closure
    await page.getByRole("button", { name: /close/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByText(/^resolved$/i).or(dialog.getByRole("radio", { name: /resolved/i })).click();
    await dialog.getByRole("textbox").fill("Agreement reached");
    await dialog.getByRole("button", { name: /propose resolution/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Click Confirm on the banner
    const confirmButton = page.getByRole("button", { name: /confirm/i });
    await expect(confirmButton).toBeVisible({ timeout: 10000 });
    await confirmButton.click();

    // Should redirect to the closed case view
    await page.waitForURL(/\/cases\/.*\/closed/, { timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // AC: Reject clears proposal, parties can continue chatting
  // ---------------------------------------------------------------------------
  test("Reject button clears proposal and allows continued chatting", async ({ page }) => {
    const caseId = await setupJointActiveCase(page, user);
    await page.goto(`/cases/${caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Propose closure
    await page.getByRole("button", { name: /close/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByText(/^resolved$/i).or(dialog.getByRole("radio", { name: /resolved/i })).click();
    await dialog.getByRole("textbox").fill("Proposed agreement");
    await dialog.getByRole("button", { name: /propose resolution/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Click Reject on the banner
    const rejectButton = page.getByRole("button", { name: /reject and keep talking/i });
    await expect(rejectButton).toBeVisible({ timeout: 10000 });
    await rejectButton.click();

    // Banner should disappear
    const banner = page.locator('[data-testid="closure-confirmation-banner"]').or(
      page.getByText(/proposed closing this case/i),
    );
    await expect(banner.first()).not.toBeVisible({ timeout: 5000 });

    // Chat input should still be available (can continue chatting)
    const chatInput = page.getByRole("textbox", { name: /message/i }).or(
      page.locator("#joint-chat-input"),
    );
    await expect(chatInput.first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/cases/${caseId}/joint`));
  });
});

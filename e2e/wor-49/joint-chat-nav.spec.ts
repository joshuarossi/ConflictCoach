import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";

/**
 * AC: 'My guidance' link in top nav opens synthesis in a side panel or modal
 * AC: 'Close' in top nav opens closure modal
 * AC: Input area has direct text input + Send button + 'Draft with Coach'
 *
 * These E2E tests verify the navigation actions and input area on the
 * joint chat page at /cases/:id/joint.
 *
 * NOTE: The test case must be in JOINT_ACTIVE status for the joint chat
 * page to be accessible. The fixture creates a case in DRAFT_PRIVATE_COACHING,
 * so these tests advance the case via test hooks.
 */

test.describe("Joint Chat — navigation actions", () => {
  test("'My guidance' link opens synthesis panel or modal", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    // Advance case to JOINT_ACTIVE via test hook
    await page.evaluate(async (caseId) => {
      const w = window as unknown as {
        __TEST_ADVANCE_CASE__?: (args: {
          caseId: string;
          targetStatus: string;
        }) => Promise<void>;
      };
      if (w.__TEST_ADVANCE_CASE__) {
        await w.__TEST_ADVANCE_CASE__({
          caseId,
          targetStatus: "JOINT_ACTIVE",
        });
      }
    }, testCase.caseId);

    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Click "My guidance" in the top nav
    const guidanceLink = page.getByRole("button", { name: /my guidance/i }).or(
      page.getByRole("link", { name: /my guidance/i }),
    );
    await expect(guidanceLink).toBeVisible();
    await guidanceLink.click();

    // A panel or modal should open containing synthesis content
    const panel = page
      .getByRole("dialog")
      .or(page.locator("[data-testid='guidance-panel']"))
      .or(page.locator("[data-testid='synthesis-panel']"));
    await expect(panel).toBeVisible();
  });

  test("'Close' nav action opens closure modal", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await page.evaluate(async (caseId) => {
      const w = window as unknown as {
        __TEST_ADVANCE_CASE__?: (args: {
          caseId: string;
          targetStatus: string;
        }) => Promise<void>;
      };
      if (w.__TEST_ADVANCE_CASE__) {
        await w.__TEST_ADVANCE_CASE__({
          caseId,
          targetStatus: "JOINT_ACTIVE",
        });
      }
    }, testCase.caseId);

    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Click "Close" in the top nav
    const closeButton = page
      .getByRole("button", { name: /^close$/i })
      .or(page.getByRole("button", { name: /close case/i }));
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Closure modal should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // The dialog should reference closure/resolution
    const dialogText = await dialog.textContent();
    expect(
      dialogText?.toLowerCase().includes("close") ||
        dialogText?.toLowerCase().includes("closure") ||
        dialogText?.toLowerCase().includes("resolve"),
    ).toBe(true);
  });

  test("input area contains text field, Send, and Draft with Coach buttons", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await page.evaluate(async (caseId) => {
      const w = window as unknown as {
        __TEST_ADVANCE_CASE__?: (args: {
          caseId: string;
          targetStatus: string;
        }) => Promise<void>;
      };
      if (w.__TEST_ADVANCE_CASE__) {
        await w.__TEST_ADVANCE_CASE__({
          caseId,
          targetStatus: "JOINT_ACTIVE",
        });
      }
    }, testCase.caseId);

    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Text input
    const input = page
      .getByRole("textbox")
      .or(page.locator('textarea[aria-label*="message" i]'));
    await expect(input).toBeVisible();

    // Send button
    const sendButton = page.getByRole("button", { name: /send/i });
    await expect(sendButton).toBeVisible();

    // Draft with Coach button (with sparkles icon)
    const draftButton = page.getByRole("button", {
      name: /draft with coach/i,
    });
    await expect(draftButton).toBeVisible();

    // Verify the sparkles icon is inside the Draft button
    const sparklesSvg = draftButton.locator("svg");
    await expect(sparklesSvg).toBeVisible();
  });
});

test.describe("Joint Chat — timestamp on hover", () => {
  test("hovering over a message reveals the timestamp", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await page.evaluate(async (caseId) => {
      const w = window as unknown as {
        __TEST_ADVANCE_CASE__?: (args: {
          caseId: string;
          targetStatus: string;
        }) => Promise<void>;
      };
      if (w.__TEST_ADVANCE_CASE__) {
        await w.__TEST_ADVANCE_CASE__({
          caseId,
          targetStatus: "JOINT_ACTIVE",
        });
      }
    }, testCase.caseId);

    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Wait for at least one message to appear (coach opening message)
    const messageBubble = page
      .locator('[data-author-type]')
      .first();
    await expect(messageBubble).toBeVisible({ timeout: 10000 });

    // Before hover, timestamp should be hidden
    const timestamp = messageBubble.locator(
      'time, [data-testid="timestamp"]',
    );

    // Hover to reveal
    await messageBubble.hover();
    await expect(timestamp).toBeVisible();
  });
});

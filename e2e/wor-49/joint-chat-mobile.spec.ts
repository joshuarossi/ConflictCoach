import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";

/**
 * AC: Mobile: responsive layout per DesignDoc section 4.9
 *
 * On mobile viewports:
 * - Top nav collapses to hamburger
 * - Draft Coach trigger is still accessible
 * - Layout adapts to smaller screen
 */

test.describe("Joint Chat — mobile responsive", () => {
  test.use({
    viewport: { width: 375, height: 812 }, // iPhone X dimensions
  });

  test("layout adapts on mobile viewport", async ({ page }) => {
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

    // The page should render without horizontal overflow
    const bodyWidth = await page.evaluate(
      () => document.body.scrollWidth,
    );
    expect(bodyWidth).toBeLessThanOrEqual(375);

    // Top nav should have a hamburger menu or collapsed nav on mobile
    const hamburger = page
      .getByRole("button", { name: /menu/i })
      .or(page.locator('[data-testid="mobile-menu-toggle"]'))
      .or(page.locator('[aria-label="Toggle menu"]'));
    await expect(hamburger).toBeVisible();

    // "My guidance" and "Close" may be hidden behind the hamburger
    // but the Draft with Coach button should remain accessible
    const draftButton = page.getByRole("button", {
      name: /draft with coach/i,
    });
    await expect(draftButton).toBeVisible();
  });

  test("message input is visible and usable on mobile", async ({ page }) => {
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

    // Text input should be visible
    const input = page
      .getByRole("textbox")
      .or(page.locator('textarea[aria-label*="message" i]'));
    await expect(input).toBeVisible();

    // Send button should be visible
    const sendButton = page.getByRole("button", { name: /send/i });
    await expect(sendButton).toBeVisible();
  });
});

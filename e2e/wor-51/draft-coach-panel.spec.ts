/**
 * WOR-51 E2E: DraftCoachPanel open + "Draft it for me" button
 *
 * AC1: Panel opens from the "Draft with Coach" button in the joint chat
 *      input bar.
 * AC4: "Draft it for me" button sends canonical readiness message.
 *
 * These tests will FAIL until the Draft Coach frontend is implemented —
 * correct red state.
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";

/**
 * Advances a solo case to JOINT_ACTIVE using the test hook.
 */
async function advanceCaseToJointActive(
  page: import("@playwright/test").Page,
  caseId: string,
): Promise<void> {
  await page.evaluate(async (id) => {
    const w = window as unknown as {
      __TEST_ADVANCE_CASE__?: (args: {
        caseId: string;
        targetStatus: string;
      }) => Promise<void>;
    };
    if (w.__TEST_ADVANCE_CASE__) {
      await w.__TEST_ADVANCE_CASE__({
        caseId: id,
        targetStatus: "JOINT_ACTIVE",
      });
    }
  }, caseId);
}

test.describe("AC1: Panel opens from 'Draft with Coach' button", () => {
  test("clicking 'Draft with Coach' in joint chat input bar opens the panel", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await advanceCaseToJointActive(page, testCase.caseId);
    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Click "Draft with Coach" button in the joint chat input bar
    const draftButton = page.getByRole("button", {
      name: /draft with coach/i,
    });
    await expect(draftButton).toBeVisible();
    await draftButton.click();

    // The Draft Coach panel should now be visible
    const panel = page.locator("[data-testid='draft-coach-panel']");
    await expect(panel).toBeVisible();
  });

  test("panel is visible in the DOM with correct width on desktop viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await advanceCaseToJointActive(page, testCase.caseId);
    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /draft with coach/i }).click();

    const panel = page.locator("[data-testid='draft-coach-panel']");
    await expect(panel).toBeVisible();

    // Desktop panel should be approximately 420px wide
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(400);
    expect(box!.width).toBeLessThanOrEqual(440);
  });
});

test.describe("AC4: 'Draft it for me' button sends readiness message", () => {
  test("clicking 'Draft it for me' sends a canonical readiness message to the coach", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await advanceCaseToJointActive(page, testCase.caseId);
    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Open Draft Coach panel
    await page.getByRole("button", { name: /draft with coach/i }).click();
    await page.locator("[data-testid='draft-coach-panel']").waitFor();

    // Engage in initial conversation so "Draft it for me" becomes available
    const panelInput = page
      .locator("[data-testid='draft-coach-panel']")
      .getByRole("textbox");
    await panelInput.fill("I need help crafting a message about the deadline.");
    await panelInput.press("Enter");

    // Wait for the coach to respond
    await page
      .locator("[data-testid='draft-coach-panel']")
      .locator("[data-author-type='COACH'], [data-role='AI']")
      .first()
      .waitFor({ timeout: 15000 });

    // Click the "Draft it for me" button
    const draftItButton = page
      .locator("[data-testid='draft-coach-panel']")
      .getByRole("button", { name: /draft it for me/i });
    await expect(draftItButton).toBeVisible();
    await draftItButton.click();

    // After clicking, a readiness message should appear in the draft coach conversation
    // and the coach should respond with a final draft
    await page
      .locator("[data-testid='draft-coach-panel']")
      .locator("[data-testid='final-draft'], [data-testid='draft-ready-card']")
      .waitFor({ timeout: 15000 });
  });
});

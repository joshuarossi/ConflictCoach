/**
 * WOR-51 E2E: DraftReadyCard actions
 *
 * AC7: Send calls draftCoach/sendFinalDraft — the ONLY path to posting
 *      the draft to joint chat.
 * AC8: Edit drops draft text into joint chat input, closes panel.
 * AC9: Discard calls draftCoach/discardSession, closes panel.
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

/**
 * Opens Draft Coach panel, engages in conversation, and waits for a final
 * draft to appear. Returns the draft text for downstream assertions.
 */
async function openPanelAndGetDraft(
  page: import("@playwright/test").Page,
): Promise<string> {
  // Open Draft Coach panel
  await page.getByRole("button", { name: /draft with coach/i }).click();
  await page.locator("[data-testid='draft-coach-panel']").waitFor();

  // Send a message to start the coaching conversation
  const panelInput = page
    .locator("[data-testid='draft-coach-panel']")
    .getByRole("textbox");
  await panelInput.fill(
    "I want to express concern about missing the deadline constructively.",
  );
  await panelInput.press("Enter");

  // Wait for coach response
  await page
    .locator("[data-testid='draft-coach-panel']")
    .locator("[data-author-type='COACH'], [data-role='AI']")
    .first()
    .waitFor({ timeout: 15000 });

  // Click "Draft it for me" to generate a final draft
  await page
    .locator("[data-testid='draft-coach-panel']")
    .getByRole("button", { name: /draft it for me/i })
    .click();

  // Wait for the DraftReadyCard to appear
  const draftCard = page.locator(
    "[data-testid='draft-ready-card'], [data-testid='final-draft']",
  );
  await draftCard.waitFor({ timeout: 15000 });

  // Extract the draft text
  const draftText = await draftCard.innerText();
  return draftText;
}

test.describe("AC7: Send calls sendFinalDraft — ONLY path to joint chat", () => {
  test("clicking 'Send this message' posts the draft to joint chat and closes panel", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await advanceCaseToJointActive(page, testCase.caseId);
    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Count existing joint messages
    const messagesBefore = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();

    await openPanelAndGetDraft(page);

    // Click "Send this message"
    await page.getByRole("button", { name: /send this message/i }).click();

    // Draft Coach panel should close
    await expect(
      page.locator("[data-testid='draft-coach-panel']"),
    ).not.toBeVisible({ timeout: 5000 });

    // A new message should appear in the joint chat
    await page.waitForFunction(
      (prevCount) => {
        const msgs = document.querySelectorAll(
          "[data-testid='joint-chat-messages'] [data-testid='message']",
        );
        return msgs.length > prevCount;
      },
      messagesBefore,
      { timeout: 10000 },
    );
  });
});

test.describe("AC8: Edit drops draft text into joint chat input", () => {
  test("clicking 'Edit before sending' puts draft text in joint input and closes panel", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await advanceCaseToJointActive(page, testCase.caseId);
    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Count joint messages before
    const messagesBefore = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();

    await openPanelAndGetDraft(page);

    // Click "Edit before sending"
    await page.getByRole("button", { name: /edit before sending/i }).click();

    // Panel should close
    await expect(
      page.locator("[data-testid='draft-coach-panel']"),
    ).not.toBeVisible({ timeout: 5000 });

    // The joint chat input should now contain draft text
    const jointInput = page.locator("#joint-chat-input");
    const inputValue = await jointInput.inputValue();
    expect(inputValue.length).toBeGreaterThan(0);

    // CRITICAL: No new message should appear in joint chat — the user
    // hasn't sent yet
    const messagesAfter = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();
    expect(messagesAfter).toBe(messagesBefore);
  });
});

test.describe("AC9: Discard calls discardSession and closes panel", () => {
  test("clicking 'Discard' closes the panel and sends nothing to joint chat", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await advanceCaseToJointActive(page, testCase.caseId);
    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Count joint messages before
    const messagesBefore = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();

    await openPanelAndGetDraft(page);

    // Click "Discard"
    await page.getByRole("button", { name: /discard/i }).click();

    // Panel should close
    await expect(
      page.locator("[data-testid='draft-coach-panel']"),
    ).not.toBeVisible({ timeout: 5000 });

    // No new message in joint chat
    const messagesAfter = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();
    expect(messagesAfter).toBe(messagesBefore);

    // The joint chat input should remain empty
    const jointInput = page.locator("#joint-chat-input");
    const inputValue = await jointInput.inputValue();
    expect(inputValue).toBe("");
  });
});

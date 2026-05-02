/**
 * E2E tests for WOR-50 AC5: Draft Coach send gate
 *
 * The critical safety property: generating a draft does NOT auto-send to
 * the joint chat. Only an explicit "Send" click calls sendFinalDraft and
 * posts the draft as a joint message.
 *
 * These tests are expected to FAIL until the Draft Coach UI and backend
 * are implemented — correct red state.
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loginAsUser(
  page: import("@playwright/test").Page,
  userEmail: string,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(userEmail);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|cases)/);
}

async function navigateToJointChat(
  page: import("@playwright/test").Page,
  caseId: string,
) {
  await page.goto(`/cases/${caseId}/joint-chat`);
  await page.waitForSelector("[data-testid='joint-chat-messages']");
}

// ---------------------------------------------------------------------------
// AC5 E2E: Send gate — draft generation does NOT auto-send
// ---------------------------------------------------------------------------

test.describe("AC5: Draft Coach send gate", () => {
  const testCaseId = "test-case-draft-coach";
  const userEmail = "drafterA@test.com";

  test("opening Draft Coach and generating a draft does NOT create a joint message", async ({
    page,
  }) => {
    await loginAsUser(page, userEmail);
    await navigateToJointChat(page, testCaseId);

    // Count existing joint messages before draft interaction
    const messagesBefore = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();

    // Open the Draft Coach side panel
    await page.getByRole("button", { name: /draft with coach/i }).click();
    await page.waitForSelector("[data-testid='draft-coach-panel']");

    // Engage in draft coaching conversation
    const draftInput = page.getByPlaceholder(/type.*message/i);
    await draftInput.fill("I want to talk about the budget issue");
    await page.getByRole("button", { name: /send/i }).first().click();

    // Wait for AI response in the draft panel
    await page.waitForSelector(
      "[data-testid='draft-coach-panel'] [data-testid='ai-message']",
    );

    // Signal readiness to generate a draft
    await draftInput.fill("Generate Draft");
    await page.getByRole("button", { name: /send/i }).first().click();

    // Wait for the draft to appear in the panel
    await page.waitForSelector("[data-testid='final-draft']");

    // CRITICAL ASSERTION: joint chat message count has NOT increased
    const messagesAfter = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();
    expect(messagesAfter).toBe(messagesBefore);
  });

  test("clicking Send on the final draft posts it to joint chat", async ({
    page,
  }) => {
    await loginAsUser(page, userEmail);
    await navigateToJointChat(page, testCaseId);

    // Open Draft Coach and generate a draft (abbreviated setup)
    await page.getByRole("button", { name: /draft with coach/i }).click();
    await page.waitForSelector("[data-testid='draft-coach-panel']");

    const draftInput = page.getByPlaceholder(/type.*message/i);
    await draftInput.fill("Generate Draft");
    await page.getByRole("button", { name: /send/i }).first().click();

    await page.waitForSelector("[data-testid='final-draft']");

    // Count messages before sending
    const messagesBefore = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();

    // Click the explicit Send button on the final draft
    await page
      .locator("[data-testid='final-draft']")
      .getByRole("button", { name: /^send$/i })
      .click();

    // Wait for the message to appear in joint chat
    await page.waitForFunction(
      (prevCount) => {
        const msgs = document.querySelectorAll(
          "[data-testid='joint-chat-messages'] [data-testid='message']",
        );
        return msgs.length > prevCount;
      },
      messagesBefore,
    );

    // Joint chat now has one more message
    const messagesAfter = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();
    expect(messagesAfter).toBe(messagesBefore + 1);
  });

  test("discarding a draft does NOT send anything to joint chat", async ({
    page,
  }) => {
    await loginAsUser(page, userEmail);
    await navigateToJointChat(page, testCaseId);

    const messagesBefore = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();

    // Open Draft Coach, generate draft, then discard
    await page.getByRole("button", { name: /draft with coach/i }).click();
    await page.waitForSelector("[data-testid='draft-coach-panel']");

    const draftInput = page.getByPlaceholder(/type.*message/i);
    await draftInput.fill("Generate Draft");
    await page.getByRole("button", { name: /send/i }).first().click();

    await page.waitForSelector("[data-testid='final-draft']");

    // Click Discard
    await page
      .locator("[data-testid='final-draft']")
      .getByRole("button", { name: /discard/i })
      .click();

    // Verify the draft panel closes or shows discarded state
    await expect(
      page.locator("[data-testid='final-draft']"),
    ).not.toBeVisible();

    // CRITICAL ASSERTION: no new joint message
    const messagesAfter = await page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .count();
    expect(messagesAfter).toBe(messagesBefore);
  });
});

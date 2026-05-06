/**
 * WOR-74: Draft Coach send gate E2E
 *
 * Six focused tests validating the Draft Coach's core trust promise:
 * AI-generated drafts never reach joint chat without explicit user approval.
 *
 * Each test creates its own user/case and advances to JOINT_ACTIVE via
 * the advanceCaseToStatus fixture shortcut — this is NOT a full-flow test.
 *
 * Requires CLAUDE_MOCK=true for deterministic AI responses.
 */
import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginAsUser,
  createTestCase,
  advanceCaseToStatus,
} from "../fixtures";

// ---------------------------------------------------------------------------
// Shared helper: reach DraftReadyCard state
// ---------------------------------------------------------------------------

/**
 * Opens the Draft Coach panel, sends a user message, waits for the AI
 * response, clicks "Draft it for me", and waits for DraftReadyCard.
 * Returns the draft card locator for downstream assertions.
 */
async function openPanelAndGetDraft(
  page: import("@playwright/test").Page,
): Promise<import("@playwright/test").Locator> {
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
  const draftCard = page.locator("[data-testid='draft-ready-card']");
  await draftCard.waitFor({ timeout: 15000 });

  return draftCard;
}

// ---------------------------------------------------------------------------
// Shared setup: create user, case, advance to JOINT_ACTIVE, navigate
// ---------------------------------------------------------------------------

async function setupJointActivePage(
  page: import("@playwright/test").Page,
): Promise<void> {
  const user = await createTestUser(page);
  await loginAsUser(page, user);
  const testCase = await createTestCase(page, user, { isSolo: true });
  await advanceCaseToStatus(page, testCase.caseId, "JOINT_ACTIVE");
  await page.goto(`/cases/${testCase.caseId}/joint`);
  await page.waitForLoadState("networkidle");
}

/**
 * Returns the current count of messages in the joint chat area.
 */
async function countJointMessages(
  page: import("@playwright/test").Page,
): Promise<number> {
  return page
    .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
    .count();
}

// ---------------------------------------------------------------------------
// Tests — one per AC
// ---------------------------------------------------------------------------

test.describe("WOR-74: Draft Coach send gate E2E", () => {
  test("AC1: starts a draft session via the Draft Coach panel", async ({
    page,
  }) => {
    await setupJointActivePage(page);

    // Click "Draft with Coach" to open the panel
    await page.getByRole("button", { name: /draft with coach/i }).click();

    // Panel should be visible
    await expect(
      page.locator("[data-testid='draft-coach-panel']"),
    ).toBeVisible();

    // Privacy banner should be visible
    await expect(page.locator("[data-testid='privacy-banner']")).toBeVisible();

    // Panel chat area should have no messages yet (session not created until
    // the user sends a message)
    const panelMessages = page
      .locator("[data-testid='draft-coach-panel']")
      .locator("[data-author-type='COACH'], [data-role='AI']");
    await expect(panelMessages).toHaveCount(0);
  });

  test("AC2: iterates with Draft Coach — sends messages, receives AI responses", async ({
    page,
  }) => {
    await setupJointActivePage(page);

    const messagesBefore = await countJointMessages(page);

    // Open Draft Coach panel
    await page.getByRole("button", { name: /draft with coach/i }).click();
    await page.locator("[data-testid='draft-coach-panel']").waitFor();

    // Send a message
    const panelInput = page
      .locator("[data-testid='draft-coach-panel']")
      .getByRole("textbox");
    await panelInput.fill("I need help expressing my frustration calmly.");
    await panelInput.press("Enter");

    // User message should appear in the panel
    // (the user message text should be visible somewhere in the panel)
    await expect(
      page
        .locator("[data-testid='draft-coach-panel']")
        .getByText("I need help expressing my frustration calmly."),
    ).toBeVisible({ timeout: 5000 });

    // Wait for AI response in the panel
    const aiResponse = page
      .locator("[data-testid='draft-coach-panel']")
      .locator("[data-author-type='COACH'], [data-role='AI']")
      .first();
    await aiResponse.waitFor({ timeout: 15000 });

    // AI response should be non-empty
    const responseText = await aiResponse.innerText();
    expect(responseText.length).toBeGreaterThan(0);

    // CRITICAL: joint chat message count must NOT have changed
    const messagesAfter = await countJointMessages(page);
    expect(messagesAfter).toBe(messagesBefore);
  });

  test("AC3: 'Generate Draft' produces a draft but does NOT post to joint chat", async ({
    page,
  }) => {
    await setupJointActivePage(page);

    // Record joint message count before any draft interaction
    const messagesBefore = await countJointMessages(page);

    // Open panel, converse, and generate a draft
    const draftCard = await openPanelAndGetDraft(page);

    // DraftReadyCard should contain draft text
    const draftText = await draftCard.innerText();
    expect(draftText.length).toBeGreaterThan(0);

    // CORE INVARIANT: joint chat message count must NOT have increased
    const messagesAfter = await countJointMessages(page);
    expect(messagesAfter).toBe(messagesBefore);
  });

  test("AC4: 'Send this message' posts the draft to joint chat", async ({
    page,
  }) => {
    await setupJointActivePage(page);

    const messagesBefore = await countJointMessages(page);

    const draftCard = await openPanelAndGetDraft(page);

    // Capture draft text from DraftReadyCard before sending. Scope to the
    // inner draft-text-content div so the captured text doesn't include
    // the card header ("Your draft is ready") or action button labels —
    // otherwise the toContain assertion below can never pass because the
    // joint chat message text is shorter than the full card text.
    const draftText = (
      await draftCard.locator('[data-testid="draft-text-content"]').innerText()
    ).trim();
    expect(draftText.length).toBeGreaterThan(0);

    // Click "Send this message"
    await page.getByRole("button", { name: /send this message/i }).click();

    // Panel should close
    await expect(
      page.locator("[data-testid='draft-coach-panel']"),
    ).not.toBeVisible({ timeout: 5000 });

    // Wait for joint chat message count to increase
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

    // Joint chat now has exactly one more message
    const messagesAfter = await countJointMessages(page);
    expect(messagesAfter).toBe(messagesBefore + 1);

    // The new message's text content must match the draft
    const lastMessage = page
      .locator("[data-testid='joint-chat-messages'] [data-testid='message']")
      .last();
    const lastMessageText = (await lastMessage.innerText()).trim();
    expect(lastMessageText).toContain(draftText);
  });

  test("AC5: discarding a draft session sends nothing to joint chat", async ({
    page,
  }) => {
    await setupJointActivePage(page);

    const messagesBefore = await countJointMessages(page);

    await openPanelAndGetDraft(page);

    // Click "Discard"
    await page.getByRole("button", { name: /discard/i }).click();

    // Panel should close
    await expect(
      page.locator("[data-testid='draft-coach-panel']"),
    ).not.toBeVisible({ timeout: 5000 });

    // Joint chat message count must NOT have changed
    const messagesAfter = await countJointMessages(page);
    expect(messagesAfter).toBe(messagesBefore);

    // Joint chat input should remain empty
    const jointInput = page.locator("#joint-chat-input");
    const inputValue = await jointInput.inputValue();
    expect(inputValue).toBe("");
  });

  test("AC6: 'Edit before sending' drops text into joint chat input without sending", async ({
    page,
  }) => {
    await setupJointActivePage(page);

    const messagesBefore = await countJointMessages(page);

    await openPanelAndGetDraft(page);

    // Click "Edit before sending"
    await page.getByRole("button", { name: /edit before sending/i }).click();

    // Panel should close
    await expect(
      page.locator("[data-testid='draft-coach-panel']"),
    ).not.toBeVisible({ timeout: 5000 });

    // Joint chat input should contain draft text (non-empty)
    const jointInput = page.locator("#joint-chat-input");
    const inputValue = await jointInput.inputValue();
    expect(inputValue.length).toBeGreaterThan(0);

    // CRITICAL: no message should have been sent to joint chat
    const messagesAfter = await countJointMessages(page);
    expect(messagesAfter).toBe(messagesBefore);
  });
});

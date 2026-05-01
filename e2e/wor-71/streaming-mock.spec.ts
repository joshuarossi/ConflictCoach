import { test, expect } from "@playwright/test";

/**
 * WOR-71 AC: Stub simulates streaming with configurable delays
 * WOR-71 AC: CLAUDE_MOCK=true env var triggers stub AI responder
 *
 * This E2E test verifies the streaming mock experience from the user's
 * perspective: sending a private coaching message should show a streaming
 * indicator that transitions to a complete response with canned text.
 *
 * Requires: CLAUDE_MOCK=true set in the Convex deployment environment,
 * an authenticated user, and an active case in private coaching phase.
 */

// @ts-expect-error WOR-71 red-state import: implementation is created by task-implement.
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";

test.describe("AC: Mock streaming simulation in E2E", () => {
  test("sending a private coaching message shows streaming then completes with canned response", async ({
    page,
  }) => {
    // Set up: create user, log in, create a case in private coaching
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const caseData = await createTestCase(page, user);

    // Navigate to the private coaching view for this case
    await page.goto(`/case/${caseData.caseId}/private-coaching`);

    // Send a message
    const input = page.getByRole("textbox");
    await input.fill("I need help with a workplace conflict");
    await input.press("Enter");

    // Expect a streaming indicator to appear (AI is generating)
    const streamingIndicator = page.getByTestId("streaming-indicator");
    await expect(streamingIndicator).toBeVisible({ timeout: 5000 });

    // Wait for the response to complete — indicator should disappear
    await expect(streamingIndicator).toBeHidden({ timeout: 15000 });

    // The AI response message should be visible with canned content
    const aiMessages = page.locator('[data-author-type="AI"]');
    await expect(aiMessages.last()).toBeVisible();
    const responseText = await aiMessages.last().textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(10);
  });
});

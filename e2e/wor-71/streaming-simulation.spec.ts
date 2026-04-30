/**
 * WOR-71 — AC: Stub simulates streaming with configurable delays
 *
 * E2E test: send a message in private coaching with CLAUDE_MOCK=true,
 * assert that the UI shows a STREAMING indicator, then transitions to
 * COMPLETE with the canned response text.
 *
 * This test exercises the mock streaming path through the full stack:
 * client → mutation → action (mock) → reactive query → UI update.
 *
 * Today this test FAILS because the fixtures don't exist and the
 * role-specific mock responses haven't been wired.
 */
import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginAsUser,
  createTestCase,
} from "../fixtures";

test("Stub simulates streaming with configurable delays — UI shows STREAMING then COMPLETE", async ({
  page,
}) => {
  // Seed a user and case
  const testUser = await createTestUser({
    email: `streaming-${Date.now()}@test.conflictcoach.app`,
    displayName: "Streaming Test User",
  });
  const testCase = await createTestCase({
    userId: testUser.id,
    category: "workplace",
    mainTopic: "Streaming simulation test",
    description: "Testing that the mock streams tokens incrementally.",
    desiredOutcome: "See streaming indicator then complete response.",
  });

  // Log in and navigate to the private coaching view for this case
  await loginAsUser(page, testUser);
  await page.goto(`/case/${testCase.id}/private-coaching`);

  // Send a message
  const messageInput = page.locator(
    '[data-testid="private-coaching-input"], textarea[name="message"], input[name="message"]',
  );
  await expect(messageInput).toBeVisible({ timeout: 10_000 });
  await messageInput.fill("Tell me about my situation.");
  await messageInput.press("Enter");

  // The AI response should first appear with a STREAMING status indicator
  const streamingIndicator = page.locator(
    '[data-testid="streaming-indicator"], [data-status="STREAMING"]',
  );
  await expect(streamingIndicator).toBeVisible({ timeout: 10_000 });

  // Then it should transition to COMPLETE
  const completeMessage = page.locator(
    '[data-testid="ai-message"][data-status="COMPLETE"], [data-status="COMPLETE"]',
  );
  await expect(completeMessage).toBeVisible({ timeout: 15_000 });

  // The final response text should contain coaching-style language
  // (the mock canned response for PRIVATE_COACH role)
  const responseText = await completeMessage.textContent();
  expect(responseText).toBeTruthy();
  expect(responseText!.length).toBeGreaterThan(10);
});

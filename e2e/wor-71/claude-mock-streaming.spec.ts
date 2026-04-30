/**
 * WOR-71: E2E test for Claude mock streaming in the UI.
 *
 * Covers:
 * - AC2: CLAUDE_MOCK=true env var triggers stub AI responder in Convex actions
 * - AC4: Stub simulates streaming with configurable delays
 *
 * This test exercises the full round-trip: send a message in private coaching,
 * observe the UI streaming indicator, then see the completed mock response.
 * It requires the test fixtures (AC5) and the Claude mock (AC2/AC3/AC4) to
 * be implemented. Until then, it will fail — the correct "red" state.
 */

import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";

test("CLAUDE_MOCK=true triggers stub AI responder — streaming visible in UI", async ({
  page,
}) => {
  // Set up: create a user, log in, create a solo case in private coaching
  const user = await createTestUser({
    email: `mock-stream-${Date.now()}@example.com`,
    displayName: "Mock Stream Tester",
  });
  await loginAsUser(page, user);

  const testCase = await createTestCase({
    initiatorUserId: user.userId,
    category: "workplace",
    mainTopic: "Streaming test conflict",
    description: "Testing that the mock streams correctly",
    desiredOutcome: "See streaming indicator",
    isSolo: true,
  });

  // Navigate to the private coaching view for this case
  await page.goto(`/case/${testCase.caseId}`);

  // Send a message in private coaching
  const messageInput = page.getByRole("textbox");
  await messageInput.fill("Hello, I need help with a conflict");
  await messageInput.press("Enter");

  // AC4: The stub should simulate streaming — look for a STREAMING indicator
  // in the UI before the response completes.
  // The streaming indicator may be a CSS class, aria attribute, or visible element.
  const streamingIndicator = page.locator(
    '[data-status="STREAMING"], [aria-label*="streaming"], .streaming-indicator'
  );

  // We expect the streaming state to appear (even briefly)
  await expect(streamingIndicator).toBeAttached({ timeout: 5_000 });

  // AC2: Eventually the stub completes with a COMPLETE status and the canned
  // response text is visible.
  const aiResponse = page.locator('[data-role="AI"], [data-author="coach"]');
  await expect(aiResponse).toBeVisible({ timeout: 10_000 });

  // The response should contain substantive text (not empty, not an error)
  const responseText = await aiResponse.textContent();
  expect(responseText).toBeDefined();
  expect(responseText!.length).toBeGreaterThan(20);
});

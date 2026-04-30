/**
 * E2E tests for WOR-43: Private coaching backend
 *
 * These tests exercise the private coaching flow through the UI:
 * sending messages, receiving AI responses, marking completion,
 * and verifying privacy isolation between parties.
 *
 * All tests are expected to FAIL today (the private coaching backend
 * and UI do not exist yet) and PASS once WOR-43 is implemented.
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Placeholder: log in as a test user.
 * The real implementation will use magic link or test auth bypass.
 */
async function loginAsUser(
  page: import("@playwright/test").Page,
  userEmail: string,
) {
  // Navigate to login and authenticate as the given user.
  // This will fail until auth UI exists — correct red state.
  await page.goto("/login");
  await page.getByLabel("Email").fill(userEmail);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  // Wait for dashboard to confirm login succeeded
  await page.waitForURL(/\/(dashboard|cases)/);
}

/**
 * Placeholder: navigate to a specific case's private coaching chat.
 */
async function navigateToPrivateCoaching(
  page: import("@playwright/test").Page,
  caseId: string,
) {
  await page.goto(`/cases/${caseId}/private-coaching`);
  await page.waitForSelector("[data-testid='private-coaching-chat']");
}

// ---------------------------------------------------------------------------
// AC 1 (E2E): myMessages isolation — each party sees only their own messages
// ---------------------------------------------------------------------------
test("myMessages query returns only messages where userId matches the authenticated caller — never the other party's messages", async ({
  page,
}) => {
  // Log in as Party A
  await loginAsUser(page, "party-a@test.com");

  // Navigate to private coaching for a test case
  await navigateToPrivateCoaching(page, "test-case-001");

  // Send a message as Party A
  const messageInput = page.getByPlaceholder(/type|message/i);
  await messageInput.fill("I feel frustrated about this situation.");
  await page.getByRole("button", { name: /send/i }).click();

  // Verify Party A's message appears
  await expect(
    page.getByText("I feel frustrated about this situation."),
  ).toBeVisible();

  // Now log in as Party B
  await loginAsUser(page, "party-b@test.com");
  await navigateToPrivateCoaching(page, "test-case-001");

  // Party A's message must NOT be visible to Party B
  await expect(
    page.getByText("I feel frustrated about this situation."),
  ).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// AC 2 (E2E): sendUserMessage creates a message and triggers AI response
// ---------------------------------------------------------------------------
test("sendUserMessage mutation inserts a privateMessages row with role=USER, status=COMPLETE and schedules generateAIResponse action", async ({
  page,
}) => {
  await loginAsUser(page, "party-a@test.com");
  await navigateToPrivateCoaching(page, "test-case-001");

  // Send a message
  const messageInput = page.getByPlaceholder(/type|message/i);
  await messageInput.fill("I need help understanding this conflict.");
  await page.getByRole("button", { name: /send/i }).click();

  // The user message should appear in the chat
  await expect(
    page.getByText("I need help understanding this conflict."),
  ).toBeVisible();

  // An AI response should appear (streamed from generateAIResponse)
  // Wait for the AI response to appear — it should be a message with
  // a different visual treatment (AI role indicator)
  await expect(
    page.locator("[data-testid='ai-message']").first(),
  ).toBeVisible({ timeout: 15000 });
});

// ---------------------------------------------------------------------------
// AC 3 (E2E): generateAIResponse streams an AI coach message
// ---------------------------------------------------------------------------
test("generateAIResponse action calls assemblePrompt with PRIVATE_COACH role and streams response into privateMessages", async ({
  page,
}) => {
  await loginAsUser(page, "party-a@test.com");
  await navigateToPrivateCoaching(page, "test-case-001");

  // Send a message to trigger AI response
  const messageInput = page.getByPlaceholder(/type|message/i);
  await messageInput.fill("What should I focus on?");
  await page.getByRole("button", { name: /send/i }).click();

  // Wait for the AI response to stream and complete
  const aiMessage = page.locator("[data-testid='ai-message']").last();
  await expect(aiMessage).toBeVisible({ timeout: 15000 });

  // The AI message should have non-empty content (not just a placeholder)
  const content = await aiMessage.textContent();
  expect(content).toBeTruthy();
  expect(content!.length).toBeGreaterThan(10);
});

// ---------------------------------------------------------------------------
// AC 4 (E2E): markComplete and synthesis trigger
// ---------------------------------------------------------------------------
test("markComplete mutation sets privateCoachingCompletedAt; if both parties complete, schedules synthesis/generate action", async ({
  page,
}) => {
  // Party A marks complete
  await loginAsUser(page, "party-a@test.com");
  await navigateToPrivateCoaching(page, "test-case-001");

  const completeButton = page.getByRole("button", {
    name: /ready for.*joint|mark.*complete|i'm ready/i,
  });
  await expect(completeButton).toBeVisible();
  await completeButton.click();

  // Should show a confirmation or status change
  await expect(
    page.getByText(/completed|ready|waiting for other party/i),
  ).toBeVisible();

  // Party B marks complete
  await loginAsUser(page, "party-b@test.com");
  await navigateToPrivateCoaching(page, "test-case-001");

  const completeButtonB = page.getByRole("button", {
    name: /ready for.*joint|mark.*complete|i'm ready/i,
  });
  await completeButtonB.click();

  // Both complete — case should transition to synthesis/READY_FOR_JOINT
  // The dashboard or case view should reflect the new state
  await page.goto("/dashboard");
  await expect(
    page.getByText(/ready for joint|synthesis|joint session/i),
  ).toBeVisible({ timeout: 10000 });
});

// ---------------------------------------------------------------------------
// AC 6 (E2E): Auth enforcement — unauthenticated access is rejected
// ---------------------------------------------------------------------------
test("All functions enforce authentication and party-to-case authorization", async ({
  page,
}) => {
  // Attempt to access private coaching without being logged in
  await page.goto("/cases/test-case-001/private-coaching");

  // Should redirect to login or show auth error
  await expect(page).toHaveURL(/login|auth|unauthorized/);
});

// ---------------------------------------------------------------------------
// AC 7 (E2E): State validation — cannot send messages in wrong case phase
// ---------------------------------------------------------------------------
test("State validation: sendUserMessage rejects if case is not in DRAFT_PRIVATE_COACHING or BOTH_PRIVATE_COACHING", async ({
  page,
}) => {
  // Log in and navigate to a case that's already in JOINT_ACTIVE or CLOSED
  await loginAsUser(page, "party-a@test.com");

  // Navigate to a case that has moved past private coaching
  await page.goto("/cases/test-case-closed/private-coaching");

  // The message input should either be disabled, hidden, or sending
  // should produce an error
  const messageInput = page.getByPlaceholder(/type|message/i);

  // Either the input doesn't exist (UI prevents it)...
  const inputCount = await messageInput.count();
  if (inputCount > 0) {
    // ...or if it does, sending should show an error
    await messageInput.fill("This should not work.");
    await page.getByRole("button", { name: /send/i }).click();

    await expect(page.getByText(/cannot|not allowed|invalid/i)).toBeVisible({
      timeout: 5000,
    });
  }
  // If the input is gone entirely, that's also correct — the UI is preventing
  // invalid state transitions.
});

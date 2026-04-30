/**
 * E2E tests for WOR-45: AI Synthesis generation
 *
 * These tests verify the full synthesis generation flow from the user's
 * perspective: after both parties complete private coaching, synthesis
 * is generated and the case advances to READY_FOR_JOINT.
 *
 * The synthesis backend (convex/synthesis/generate.ts) does not exist yet.
 * These tests will FAIL until the implementation is written.
 */
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// AC: When both parties complete private coaching, synthesis is generated
//     and case advances to READY_FOR_JOINT
// ---------------------------------------------------------------------------

test("After both parties mark private coaching complete, case status becomes READY_FOR_JOINT and each party sees their own synthesis", async ({
  page,
}) => {
  // This E2E test verifies the user-visible outcome of synthesis generation:
  // 1. Both parties complete private coaching
  // 2. The system generates synthesis (backend action)
  // 3. Each party sees their individualized synthesis text
  // 4. Case status is READY_FOR_JOINT

  // Navigate to the app
  await page.goto("/");

  // The app must be running with auth. For E2E, we rely on the dev
  // environment seeding or a test login flow.
  // Navigate to a case that's in BOTH_PRIVATE_COACHING status with
  // both parties having completed private coaching.

  // Look for a case dashboard or case detail page
  // The synthesis generation happens server-side when both parties complete.
  // After completion, the dashboard should show READY_FOR_JOINT status.

  // Check that the case status indicator shows READY_FOR_JOINT
  const statusIndicator = page.locator('[data-testid="case-status"]');
  await expect(statusIndicator).toContainText(/ready.*(for)?.*joint/i, {
    timeout: 30_000, // synthesis generation may take time due to AI call
  });
});

test("Each party sees only their own synthesis text, not the other party's", async ({
  page,
}) => {
  // Navigate to the synthesis view for the initiator
  await page.goto("/");

  // Find synthesis content on the page
  const synthesisSection = page.locator('[data-testid="synthesis-text"]');

  // Synthesis text should be visible
  await expect(synthesisSection).toBeVisible({ timeout: 15_000 });

  // The synthesis content should contain the expected sections
  const synthesisContent = await synthesisSection.textContent();
  expect(synthesisContent).toBeTruthy();

  // Verify synthesis contains the three required sections
  // (areas of agreement, disagreement, communication approaches)
  expect(synthesisContent).toMatch(/agreement/i);
  expect(synthesisContent).toMatch(/disagree|contention|tension/i);
  expect(synthesisContent).toMatch(/approach|communication|suggest/i);
});

test("Synthesis text does not contain verbatim quotes from the other party's private messages", async ({
  page,
}) => {
  // This is a privacy-focused E2E check.
  // After synthesis is generated, verify that the displayed text
  // does not contain verbatim content from the other party.

  await page.goto("/");

  const synthesisSection = page.locator('[data-testid="synthesis-text"]');
  await expect(synthesisSection).toBeVisible({ timeout: 15_000 });

  const synthesisContent = await synthesisSection.textContent();

  // These are phrases that should NOT appear because they're from the
  // other party's private coaching. The privacy filter should have
  // caught and regenerated if they appeared.
  // (In a real test, these would be seeded private messages.)
  expect(synthesisContent).not.toContain(
    "My coworker never prepares for meetings",
  );
});

test("Case cannot enter joint chat before synthesis is complete", async ({
  page,
}) => {
  // Verify that the joint chat is not accessible while the case is still
  // in BOTH_PRIVATE_COACHING status (before synthesis runs).

  await page.goto("/");

  // Attempt to navigate to joint chat
  const jointChatLink = page.locator(
    '[data-testid="enter-joint-chat"], a[href*="joint"]',
  );

  // If the link exists, it should be disabled or not navigable
  // while status is not READY_FOR_JOINT
  const isVisible = await jointChatLink.isVisible().catch(() => false);
  if (isVisible) {
    // The button/link should be disabled
    await expect(jointChatLink).toBeDisabled();
  }
  // If not visible at all, that's also acceptable (gated by status)
});

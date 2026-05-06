/**
 * WOR-58 E2E: Invitee case form flow
 *
 * AC3: Form UI renders mainTopic, description, desiredOutcome with expected
 *      labels and privacy indicators at /cases/:id/form
 * AC5: On submit, the user is routed to /cases/:id/private
 * AC6: Submitting with empty mainTopic shows inline error
 *
 * These tests will FAIL until the implementation exists — correct red state.
 */
import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginAsUser,
  createTestCase,
  callMutation,
} from "../fixtures";

/**
 * Creates a two-party case and redeems the invite as a second user, producing
 * a case where the invitee has a partyStates row but has not yet filled the
 * form. Returns the caseId and the invitee user credentials.
 */
async function setupInviteeScenario(page: import("@playwright/test").Page) {
  // Create initiator and their case
  const initiator = await createTestUser(page);
  await loginAsUser(page, initiator);
  const testCase = await createTestCase(page, initiator, { isSolo: false });

  // Create invitee user
  const invitee = await createTestUser(page);

  // Redeem the invite as the invitee. The test-support mutation creates the
  // invitee's partyStates row and binds them to the case.
  if (testCase.inviteToken) {
    await loginAsUser(page, invitee);
    await callMutation(page, "invites/redeem:redeem", {
      token: testCase.inviteToken,
    });
  }

  return { caseId: testCase.caseId, invitee, initiator };
}

// ===========================================================================
// AC3: Form UI renders at /cases/:id/form
// ===========================================================================
test.describe("AC3: Invitee form UI renders correctly", () => {
  test("navigating to /cases/:id/form shows mainTopic, description, and desiredOutcome fields", async ({
    page,
  }) => {
    const { caseId, invitee } = await setupInviteeScenario(page);
    await loginAsUser(page, invitee);

    await page.goto(`/cases/${caseId}/form`);
    await page.waitForLoadState("networkidle");

    // All three form fields should be visible
    await expect(page.getByLabel(/Main Topic/i)).toBeVisible();
    await expect(page.getByLabel(/Description/i)).toBeVisible();
    await expect(page.getByLabel(/Desired Outcome/i)).toBeVisible();
  });

  test("privacy indicators are present on description and desiredOutcome", async ({
    page,
  }) => {
    const { caseId, invitee } = await setupInviteeScenario(page);
    await loginAsUser(page, invitee);

    await page.goto(`/cases/${caseId}/form`);
    await page.waitForLoadState("networkidle");

    // "Private to you" text should appear at least twice (description + desiredOutcome)
    const privateTexts = page.getByText(/Private to you/i);
    await expect(privateTexts).toHaveCount(2);
  });

  test("character counter is visible for mainTopic", async ({ page }) => {
    const { caseId, invitee } = await setupInviteeScenario(page);
    await loginAsUser(page, invitee);

    await page.goto(`/cases/${caseId}/form`);
    await page.waitForLoadState("networkidle");

    // Character counter should show 0/140 initially
    await expect(page.getByText(/0\/140/)).toBeVisible();
  });
});

// ===========================================================================
// AC5: On submit, user is routed to /cases/:id/private
// ===========================================================================
test.describe("AC5: Submission routes to private coaching", () => {
  test("filling the form and submitting navigates to /cases/:id/private", async ({
    page,
  }) => {
    const { caseId, invitee } = await setupInviteeScenario(page);
    await loginAsUser(page, invitee);

    await page.goto(`/cases/${caseId}/form`);
    await page.waitForLoadState("networkidle");

    // Fill the form
    await page.getByLabel(/Main Topic/i).fill("We need to discuss workload");
    await page
      .getByLabel(/Description/i)
      .fill("I feel overwhelmed with the current distribution.");
    await page.getByLabel(/Desired Outcome/i).fill("A fairer task allocation.");

    // Submit the form
    await page.getByRole("button", { name: /submit/i }).click();

    // Should navigate to private coaching
    await page.waitForURL(`**/cases/${caseId}/private`, { timeout: 10000 });
    expect(page.url()).toMatch(new RegExp(`/cases/${caseId}/private`));
  });
});

// ===========================================================================
// AC6: Submitting with empty mainTopic shows inline error
// ===========================================================================
test.describe("AC6: Inline validation in browser", () => {
  test("submitting with empty mainTopic shows an inline error and does NOT navigate", async ({
    page,
  }) => {
    const { caseId, invitee } = await setupInviteeScenario(page);
    await loginAsUser(page, invitee);

    await page.goto(`/cases/${caseId}/form`);
    await page.waitForLoadState("networkidle");

    // Click submit without filling mainTopic
    await page.getByRole("button", { name: /submit/i }).click();

    // Should show an inline error (role="alert")
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert.first()).toBeVisible();

    // Should NOT navigate away
    expect(page.url()).toContain(`/cases/${caseId}/form`);
  });
});

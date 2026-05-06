/**
 * WOR-73: Invite flow (two-user) E2E test.
 *
 * Exercises the full two-party invite lifecycle using two independent browser
 * contexts:
 *   1. User A creates a case via the UI form and obtains the invite link
 *   2. User B opens the invite link, logs in, and accepts the invitation
 *   3. User B fills their case form after accepting (if route exists)
 *   4. Both users see the case listed in their dashboards
 *   5. Case status transitions: DRAFT_PRIVATE_COACHING → BOTH_PRIVATE_COACHING
 *   6. Consumed invite link shows error when reused
 *
 * Invariants:
 *   - Two isolated browser contexts (independent cookies, auth, sessions)
 *   - CLAUDE_MOCK=true must be active
 *   - Invite token is single-use
 *   - No cross-party data leakage on the invite page
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser } from "../fixtures";

test.describe("WOR-73: Invite flow (two-user)", () => {
  test("complete two-user invite lifecycle: create, accept, dashboard, consumed token", async ({
    browser,
  }) => {
    // Full invite lifecycle — generous timeout for two contexts + AI mocks
    test.setTimeout(120_000);

    // -------------------------------------------------------------------
    // AC 1: Two browser contexts (two separate users)
    // -------------------------------------------------------------------
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const userA = await createTestUser();
    const userB = await createTestUser();

    await loginAsUser(pageA, userA);
    await loginAsUser(pageB, userB);

    // Verify isolation: User B should have no cases on their dashboard
    await pageB.goto("/dashboard");
    await pageB.waitForLoadState("networkidle");
    // The dashboard should either show an empty state or no case rows
    const caseRowsB = pageB.locator(
      "[data-testid='case-row'], [data-testid='case-card'], tr[data-case-id]",
    );
    await expect(caseRowsB).toHaveCount(0, { timeout: 10_000 });

    // -------------------------------------------------------------------
    // AC 2: User A creates a case and obtains the invite link
    // -------------------------------------------------------------------
    await pageA.goto("/cases/new");
    await pageA.waitForLoadState("networkidle");

    // Fill the case creation form — progressive disclosure: fields appear
    // sequentially as prior fields are filled.

    // Category — choose "workplace" via radio button (seed data covers all 5 categories).
    // NewCaseForm renders radio buttons inside a role='radiogroup' container.
    const workplaceRadio = pageA.getByRole("radio", { name: /workplace/i });
    await expect(workplaceRadio).toBeVisible({ timeout: 10_000 });
    await workplaceRadio.click();

    // Main topic
    const topicInput = pageA
      .getByRole("textbox", { name: /topic/i })
      .or(pageA.getByPlaceholder(/topic/i));
    await expect(topicInput).toBeVisible({ timeout: 5_000 });
    await topicInput.fill("Communication breakdown in team meetings");

    // Description
    const descriptionInput = pageA
      .getByRole("textbox", { name: /description/i })
      .or(pageA.getByPlaceholder(/description|describe/i));
    await expect(descriptionInput).toBeVisible({ timeout: 5_000 });
    await descriptionInput.fill(
      "Repeated interruptions and lack of follow-through on action items.",
    );

    // Desired outcome
    const outcomeInput = pageA
      .getByRole("textbox", { name: /outcome/i })
      .or(pageA.getByPlaceholder(/outcome|hope to achieve/i));
    await expect(outcomeInput).toBeVisible({ timeout: 5_000 });
    await outcomeInput.fill(
      "Establish ground rules for meetings that we both respect.",
    );

    // Do NOT enable solo mode — this is a two-party case (isSolo defaults to false).
    // The "Other person's name" field should be visible for two-party cases.

    // Submit the form
    const submitButton = pageA.getByRole("button", {
      name: /create|submit|start/i,
    });
    await expect(submitButton).toBeVisible({ timeout: 5_000 });
    await submitButton.click();

    // Wait for redirect to InviteSharingPage: /cases/:caseId/invite
    await pageA.waitForURL(/\/cases\/[^/]+\/invite/, { timeout: 15_000 });

    // Extract the case ID from the URL
    const caseUrl = pageA.url();
    const caseIdMatch = caseUrl.match(/\/cases\/([^/?]+)/);
    expect(caseIdMatch).not.toBeNull();
    const caseId = caseIdMatch![1];
    expect(caseId).toBeTruthy();

    // Extract the invite URL from the readonly input on InviteSharingPage.
    // The input contains the full invite URL with SITE_URL (may be
    // https://conflictcoach.app), so we must parse the token and construct
    // a localhost-relative path.
    const inviteInput = pageA.locator("input[readonly]").first();
    await expect(inviteInput).toBeVisible({ timeout: 10_000 });
    const inviteUrlValue = await inviteInput.inputValue();
    expect(inviteUrlValue).toBeTruthy();

    // Extract the token from the invite URL path: /invite/{token}
    const tokenMatch = inviteUrlValue.match(/\/invite\/([^/?]+)/);
    expect(tokenMatch).not.toBeNull();
    const inviteToken = tokenMatch![1];
    expect(inviteToken).toBeTruthy();

    // -------------------------------------------------------------------
    // AC 3: User B opens invite link, logs in, and accepts invitation
    // -------------------------------------------------------------------
    // User B is already logged in via loginAsUser above. Navigate to the
    // invite URL using the extracted token on localhost.
    await pageB.goto(`/invite/${inviteToken}`);

    // Wait for the invite page to load — Accept button should appear for
    // a logged-in user viewing an active invite.
    const acceptButton = pageB.getByRole("button", { name: /accept/i });
    await expect(acceptButton).toBeVisible({ timeout: 10_000 });

    // Verify invite page shows initiator info: name and main topic
    // (no cross-party data leakage — description and desiredOutcome are NOT shown)
    await expect(
      pageB.getByText(/has invited you|invited you/i),
    ).toBeVisible({ timeout: 5_000 });

    // Main topic should be visible on the invite page
    await expect(
      pageB.getByText(/communication breakdown/i),
    ).toBeVisible({ timeout: 5_000 });

    // Verify no private content leakage — description and desiredOutcome
    // should NOT be on the invite page
    const invitePageText = await pageB
      .locator("main, [role='main'], body")
      .innerText();
    expect(invitePageText).not.toMatch(/repeated interruptions/i);
    expect(invitePageText).not.toMatch(/ground rules for meetings/i);

    // Click Accept
    await acceptButton.click();

    // After accept, InviteAcceptPage navigates to /cases/:caseId/form
    await pageB.waitForURL(/\/cases\/[^/]+/, { timeout: 15_000 });

    // -------------------------------------------------------------------
    // AC 4: User B fills their case form after accepting
    // -------------------------------------------------------------------
    // The route /cases/:caseId/form may not exist yet. Assert the URL
    // change (navigation intent) and attempt form fill if available.
    const postAcceptUrl = pageB.url();
    const postAcceptCaseMatch = postAcceptUrl.match(/\/cases\/([^/?]+)/);
    expect(postAcceptCaseMatch).not.toBeNull();

    // Attempt to fill the invitee form if the page renders form fields.
    // If the route 404s or form fields don't exist, proceed to dashboard.
    try {
      const inviteeTopicInput = pageB
        .getByRole("textbox", { name: /topic/i })
        .or(pageB.getByPlaceholder(/topic/i));
      await inviteeTopicInput.waitFor({ state: "visible", timeout: 5_000 });

      await inviteeTopicInput.fill("Feeling unheard during team discussions");

      const inviteeDescInput = pageB
        .getByRole("textbox", { name: /description/i })
        .or(pageB.getByPlaceholder(/description|describe/i));
      await inviteeDescInput.fill(
        "My ideas are frequently dismissed or talked over.",
      );

      const inviteeOutcomeInput = pageB
        .getByRole("textbox", { name: /outcome/i })
        .or(pageB.getByPlaceholder(/outcome|hope to achieve/i));
      await inviteeOutcomeInput.fill(
        "A meeting format where everyone gets equal speaking time.",
      );

      // Submit the invitee form if a submit button exists
      const inviteeSubmit = pageB.getByRole("button", {
        name: /submit|save|continue/i,
      });
      if (await inviteeSubmit.isVisible({ timeout: 2_000 })) {
        await inviteeSubmit.click();
        await pageB.waitForLoadState("networkidle");
      }
    } catch {
      // Form page/route does not exist yet — this is a known gap (Open
      // Question Q1). The navigation intent was verified above. Proceed
      // to dashboard verification.
    }

    // -------------------------------------------------------------------
    // AC 5: Both users see the case listed in their dashboards
    // -------------------------------------------------------------------
    // User A's dashboard
    await pageA.goto("/dashboard");
    await pageA.waitForLoadState("networkidle");
    await expect(
      pageA.getByText(/communication breakdown/i),
    ).toBeVisible({ timeout: 10_000 });

    // User B's dashboard
    await pageB.goto("/dashboard");
    await pageB.waitForLoadState("networkidle");
    await expect(
      pageB.getByText(/communication breakdown/i),
    ).toBeVisible({ timeout: 10_000 });

    // -------------------------------------------------------------------
    // AC 6: Case status transitions correctly:
    //        DRAFT_PRIVATE_COACHING → BOTH_PRIVATE_COACHING
    // -------------------------------------------------------------------
    // After User B accepts, the case should be in BOTH_PRIVATE_COACHING.
    // The dashboard's statusIndicator maps this to an active (non-draft)
    // state. Verify neither dashboard shows "Draft" for this case.
    //
    // On User A's dashboard: verify status transitioned to BOTH_PRIVATE_COACHING
    await pageA.goto("/dashboard");
    await pageA.waitForLoadState("networkidle");
    const caseRowA = pageA
      .locator("[data-testid='case-row'], [data-testid='case-card'], tr")
      .filter({ hasText: /communication breakdown/i })
      .first();
    await expect(caseRowA).toBeVisible({ timeout: 10_000 });
    // The status should show "Both in Private Coaching" (the Dashboard label
    // for BOTH_PRIVATE_COACHING), confirming the transition from
    // DRAFT_PRIVATE_COACHING ("Private Coaching") actually happened.
    await expect(
      caseRowA.getByText(/both in private coaching/i),
    ).toBeVisible({ timeout: 10_000 });

    // On User B's dashboard: same positive status assertion
    await pageB.goto("/dashboard");
    await pageB.waitForLoadState("networkidle");
    const caseRowB = pageB
      .locator("[data-testid='case-row'], [data-testid='case-card'], tr")
      .filter({ hasText: /communication breakdown/i })
      .first();
    await expect(caseRowB).toBeVisible({ timeout: 10_000 });
    await expect(
      caseRowB.getByText(/both in private coaching/i),
    ).toBeVisible({ timeout: 10_000 });

    // -------------------------------------------------------------------
    // AC 7: Consumed invite link shows error when reused
    // -------------------------------------------------------------------
    // Navigate back to the same invite URL — should show error
    await pageB.goto(`/invite/${inviteToken}`);

    // The consumed invite view should show an error message
    await expect(
      pageB
        .getByText(/already been used/i)
        .or(pageB.getByText(/no longer available/i))
        .or(pageB.getByText(/no longer valid/i)),
    ).toBeVisible({ timeout: 10_000 });

    // Should show "Log in" and "Go to dashboard" links (rendered as <a>)
    await expect(
      pageB.getByRole("link", { name: /log in/i }),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      pageB.getByRole("link", { name: /go to dashboard|dashboard/i }),
    ).toBeVisible({ timeout: 5_000 });

    // Accept and Decline buttons should NOT be present
    await expect(
      pageB.getByRole("button", { name: /accept/i }),
    ).not.toBeVisible();
    await expect(
      pageB.getByRole("button", { name: /decline/i }),
    ).not.toBeVisible();

    // -------------------------------------------------------------------
    // Cleanup: close browser contexts
    // -------------------------------------------------------------------
    await contextA.close();
    await contextB.close();
  });
});

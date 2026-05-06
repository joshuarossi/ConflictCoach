/**
 * E2E tests for WOR-55: Solo mode (party toggle + dual-context simulation)
 *
 * Covers AC3 (URL persistence), AC5 (data isolation), AC7 (visual distinction),
 * and AC8 (dashboard badge).
 *
 * These tests use the shared e2e fixtures to create a solo case and verify
 * the party toggle, URL state, visual markers, and data isolation.
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";

// ---------------------------------------------------------------------------
// AC 3: Toggle state persists in URL query param ?as=initiator|invitee
// ---------------------------------------------------------------------------
test.describe("AC 3: URL persistence of party toggle state", () => {
  test("toggling to invitee updates URL with ?as=invitee", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const soloCase = await createTestCase(page, user, { isSolo: true });

    // Navigate to the solo case
    await page.goto(`/cases/${soloCase.caseId}`);

    // Find and click the invitee toggle segment
    const inviteeToggle = page
      .getByRole("button", { name: /invitee|jordan|viewing as/i })
      .last();
    await inviteeToggle.click();

    // URL should contain ?as=invitee
    await expect(page).toHaveURL(/[?&]as=invitee/);
  });

  test("?as=invitee survives page refresh — toggle remains on invitee", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const soloCase = await createTestCase(page, user, { isSolo: true });

    // Navigate directly with ?as=invitee
    await page.goto(`/cases/${soloCase.caseId}?as=invitee`);

    // The invitee toggle segment should be active/selected
    const inviteeSegment = page
      .getByRole("button", { name: /invitee|jordan/i })
      .last();
    await expect(inviteeSegment).toHaveAttribute("aria-pressed", "true");

    // Reload the page
    await page.reload();

    // After reload, URL should still have ?as=invitee
    await expect(page).toHaveURL(/[?&]as=invitee/);

    // Toggle should still show invitee selected
    const inviteeSegmentAfterReload = page
      .getByRole("button", { name: /invitee|jordan/i })
      .last();
    await expect(inviteeSegmentAfterReload).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("default state is ?as=initiator when no param present", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const soloCase = await createTestCase(page, user, { isSolo: true });

    // Navigate without ?as param
    await page.goto(`/cases/${soloCase.caseId}`);

    // The initiator segment should be active by default
    const initiatorSegment = page
      .getByRole("button", { name: /initiator|alex/i })
      .first();
    await expect(initiatorSegment).toHaveAttribute("aria-pressed", "true");
  });
});

// ---------------------------------------------------------------------------
// AC 5: Data queries respect the toggle — private coaching shows different
//        content for each party
// ---------------------------------------------------------------------------
test.describe("AC 5: Private coaching data isolation between parties in solo mode", () => {
  test("message sent as initiator is NOT visible when toggled to invitee", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const soloCase = await createTestCase(page, user, { isSolo: true });

    // Navigate to private coaching as initiator
    await page.goto(`/cases/${soloCase.caseId}/private?as=initiator`);

    // Send a message as initiator
    const messageInput = page.getByPlaceholder(/type|message/i);
    await messageInput.fill("This is my initiator concern.");
    await page.getByRole("button", { name: /send/i }).click();

    // Verify the message appears
    await expect(page.getByText("This is my initiator concern.")).toBeVisible();

    // Toggle to invitee
    await page.goto(`/cases/${soloCase.caseId}/private?as=invitee`);

    // The initiator's message should NOT be visible
    await expect(
      page.getByText("This is my initiator concern."),
    ).not.toBeVisible();
  });

  test("message sent as invitee is NOT visible when toggled to initiator", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const soloCase = await createTestCase(page, user, { isSolo: true });

    // Send a message as invitee
    await page.goto(`/cases/${soloCase.caseId}/private?as=invitee`);
    const messageInput = page.getByPlaceholder(/type|message/i);
    await messageInput.fill("This is my invitee perspective.");
    await page.getByRole("button", { name: /send/i }).click();

    await expect(
      page.getByText("This is my invitee perspective."),
    ).toBeVisible();

    // Switch to initiator
    await page.goto(`/cases/${soloCase.caseId}/private?as=initiator`);

    // Invitee's message should NOT be visible
    await expect(
      page.getByText("This is my invitee perspective."),
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC 7: Solo cases show prominent banner + PartyToggle per DesignDoc D6
// ---------------------------------------------------------------------------
test.describe("AC 7: Solo cases are visually distinct with banner and toggle", () => {
  test("solo case shows 'Solo Mode' banner", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const soloCase = await createTestCase(page, user, { isSolo: true });

    await page.goto(`/cases/${soloCase.caseId}`);

    // Should display a prominent solo mode banner
    await expect(page.getByText(/solo mode/i)).toBeVisible();
  });

  test("solo case shows PartyToggle in top nav", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const soloCase = await createTestCase(page, user, { isSolo: true });

    await page.goto(`/cases/${soloCase.caseId}`);

    // PartyToggle should be visible
    const toggle = page.getByTestId("party-toggle");
    await expect(toggle).toBeVisible();
  });

  test("non-solo case does NOT show PartyToggle or solo banner", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const normalCase = await createTestCase(page, user, { isSolo: false });

    await page.goto(`/cases/${normalCase.caseId}`);

    // No solo banner
    await expect(page.getByText(/solo mode/i)).not.toBeVisible();

    // No party toggle
    await expect(page.getByTestId("party-toggle")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC 8: Dashboard flags solo cases distinctly from real cases
// ---------------------------------------------------------------------------
test.describe("AC 8: Dashboard shows 'Solo' badge for solo cases", () => {
  test("solo case row on dashboard displays a 'Solo' badge", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    await createTestCase(page, user, { isSolo: true });

    // Navigate to dashboard
    await page.goto("/dashboard");

    // Should show a "Solo" badge or label on the case row
    await expect(page.getByText(/solo/i).first()).toBeVisible();
  });

  test("non-solo case row does NOT show 'Solo' badge", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    await createTestCase(page, user, { isSolo: false });

    // Navigate to dashboard
    await page.goto("/dashboard");

    // Wait for cases to load
    await page.waitForSelector(
      "[data-testid='case-row'], [data-testid='case-card'], .case-item",
      {
        timeout: 5000,
      },
    );

    // Non-solo case should not show "Solo" badge in its row
    // (The text "Solo" might appear in the "New Solo Case" button — we check the case list area)
    const caseListArea = page
      .locator("[data-testid='case-list'], main, [role='main']")
      .first();
    const soloBadges = caseListArea.getByTestId("solo-badge");
    await expect(soloBadges).toHaveCount(0);
  });
});

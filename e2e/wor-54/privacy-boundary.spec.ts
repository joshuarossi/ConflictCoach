/**
 * WOR-54: Closed case view — privacy boundary E2E
 *
 * AC8: As User B on a closed case, verify no API call returns User A's
 *      private coaching or synthesis. Inspect DOM to confirm no leakage.
 */
import { test, expect } from "@playwright/test";

// Sentinel strings seeded into User A's private data — used to detect leakage
const USER_A_PRIVATE_SENTINEL = "USER_A_PRIVATE_SENTINEL_xK9mQ";
const USER_A_SYNTHESIS_SENTINEL = "USER_A_SYNTHESIS_SENTINEL_pL3vR";

test.describe("WOR-54: Privacy boundary on closed case view", () => {
  test("User B cannot see User A's private coaching or synthesis on the closed case page", async ({
    page,
    request,
  }) => {
    // --- Setup via backend seed script ---
    // The seed endpoint creates two users, a case with private coaching
    // messages for User A containing the sentinel strings, and transitions
    // the case to CLOSED_RESOLVED status.
    const seedResponse = await request.post("/api/test-seed/closed-case", {
      data: {
        userAPrivateMessage: USER_A_PRIVATE_SENTINEL,
        userASynthesis: USER_A_SYNTHESIS_SENTINEL,
        closureStatus: "CLOSED_RESOLVED",
      },
    });
    expect(seedResponse.ok()).toBeTruthy();
    const seed = await seedResponse.json();
    const { caseId, userBCredentials } = seed;

    // Login as User B via the standard auth flow
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(userBCredentials.email);
    await page.getByLabel(/password/i).fill(userBCredentials.password);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/login/);

    // Navigate to the closed case view
    await page.goto(`/cases/${caseId}/closed`);

    // Wait for closed case view to render
    await expect(
      page.getByText(/this case is closed/i),
    ).toBeVisible();

    // --- Tab assertions: tabs must exist and be interactable ---
    const privateTab = page.getByRole("tab", {
      name: /my private coaching/i,
    });
    await expect(privateTab).toBeVisible();
    await privateTab.click();

    // Wait for private coaching panel to render
    const privatePanel = page.locator('[data-testid="private-coaching-panel"]');
    await expect(privatePanel).toBeVisible();

    // User A's private sentinel must NOT appear in the private coaching panel
    await expect(privatePanel).not.toContainText(USER_A_PRIVATE_SENTINEL);

    // Click My Guidance tab
    const guidanceTab = page.getByRole("tab", { name: /my guidance/i });
    await expect(guidanceTab).toBeVisible();
    await guidanceTab.click();

    // Wait for guidance panel to render
    const guidancePanel = page.locator('[data-testid="guidance-panel"]');
    await expect(guidancePanel).toBeVisible();

    // User A's synthesis sentinel must NOT appear in the guidance panel
    await expect(guidancePanel).not.toContainText(USER_A_SYNTHESIS_SENTINEL);

    // Final DOM-wide check: sentinels should not appear anywhere on the page
    await expect(page.locator("body")).not.toContainText(
      USER_A_PRIVATE_SENTINEL,
    );
    await expect(page.locator("body")).not.toContainText(
      USER_A_SYNTHESIS_SENTINEL,
    );
  });
});

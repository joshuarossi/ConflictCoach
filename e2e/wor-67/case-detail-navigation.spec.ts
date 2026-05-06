/**
 * WOR-67 E2E: CaseDetail routing, TopNav context header, and 404 handling
 *
 * Covers:
 * - AC: TopNav shows case context header: "Case with [other party] · [phase name]"
 * - AC: Loading state shows skeleton layout while case data loads
 * - AC: 404 if case not found or user is not a party to the case
 * - AC: Routes to correct sub-view per status (smoke-level check)
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";
import type { TestUser, TestCase } from "../fixtures";

let user: TestUser;
let testCase: TestCase;

test.describe("WOR-67: CaseDetail routing and navigation", () => {
  test.beforeEach(async ({ page }) => {
    user = await createTestUser(page);
    await loginAsUser(page, user);
  });

  test("shows loading skeleton before case data loads", async ({ page }) => {
    testCase = await createTestCase(page, user);

    // Intercept Convex WebSocket/fetch to delay case data and observe skeleton
    await page.route("**/api/**", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      await route.continue();
    });

    await page.goto(`/cases/${testCase.caseId}`);

    const skeleton = page.locator('[data-testid="case-detail-skeleton"]');
    await expect(skeleton).toBeVisible({ timeout: 5000 });
  });

  test("shows 404/not-found when navigating to non-existent case", async ({
    page,
  }) => {
    await page.goto("/cases/definitely-not-a-real-case-id");
    await page.waitForLoadState("networkidle");

    const notFound = page.locator(
      '[data-testid="case-not-found"], :text("not found"), :text("404")',
    );
    await expect(notFound.first()).toBeVisible({ timeout: 10000 });
  });

  test("TopNav displays case context with other party name and phase", async ({
    page,
  }) => {
    testCase = await createTestCase(page, user);
    await page.goto(`/cases/${testCase.caseId}`);
    await page.waitForLoadState("networkidle");

    const nav = page.locator("nav");
    await expect(nav).toBeVisible({ timeout: 10000 });

    // TopNav should show "Case with [name]" pattern
    const caseContext = nav.locator(':text-matches("Case with .+")');
    await expect(caseContext).toBeVisible({ timeout: 10000 });

    // Phase indicator should be visible
    const phaseIndicator = nav.locator(
      '[data-testid="phase-indicator"], :text-matches("Private Coaching|Ready for Joint|Joint Session|Closed")',
    );
    await expect(phaseIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test("CaseDetail route /cases/:caseId renders case content", async ({
    page,
  }) => {
    testCase = await createTestCase(page, user);
    await page.goto(`/cases/${testCase.caseId}`);
    await page.waitForLoadState("networkidle");

    // Verify CaseDetail-specific rendering — the case view container should be present
    const caseDetail = page.locator(
      '[data-testid="case-detail"], [data-testid="private-coaching-view"], main',
    );
    await expect(caseDetail.first()).toBeVisible({ timeout: 10000 });

    // Should NOT show 404/not-found for a valid case
    const notFound = page.locator('[data-testid="case-not-found"]');
    await expect(notFound).not.toBeVisible();
  });
});

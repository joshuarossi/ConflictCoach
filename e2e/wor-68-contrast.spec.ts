import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  createTestUser,
  loginAsUser,
  createTestCase,
  advanceCaseToStatus,
} from "./fixtures";

/**
 * WOR-68 AC: "Color contrast >= 4.5:1 verified for all text/background combinations"
 *
 * Uses axe-core via @axe-core/playwright to run WCAG AA color-contrast audits
 * on key pages: Dashboard, CaseDetail (private coaching), JointChatPage,
 * ClosedCasePage, and NewCasePage.
 *
 * Invariant: Text/background color contrast ratio is >= 4.5:1 for all normal
 * text across both light and dark themes.
 */

test.describe("WOR-68: Color contrast — WCAG AA compliance", () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;

  test.beforeEach(async ({ page }) => {
    user = await createTestUser(page);
    await loginAsUser(page, user);
  });

  test("Dashboard page has no color-contrast violations", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(
      results.violations,
      `Found ${results.violations.length} contrast violation(s) on Dashboard`,
    ).toHaveLength(0);
  });

  test("New Case page has no color-contrast violations", async ({ page }) => {
    await page.goto("/cases/new");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(
      results.violations,
      `Found ${results.violations.length} contrast violation(s) on New Case page`,
    ).toHaveLength(0);
  });

  test("Private Coaching page has no color-contrast violations", async ({
    page,
  }) => {
    const testCase = await createTestCase(page, user, { isSolo: true });
    await page.goto(`/cases/${testCase.caseId}/private`);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(
      results.violations,
      `Found ${results.violations.length} contrast violation(s) on Private Coaching page`,
    ).toHaveLength(0);
  });

  test("Joint Chat page has no color-contrast violations", async ({ page }) => {
    const testCase = await createTestCase(page, user, { isSolo: true });
    await advanceCaseToStatus(page, testCase.caseId, "JOINT_ACTIVE");
    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(
      results.violations,
      `Found ${results.violations.length} contrast violation(s) on Joint Chat page`,
    ).toHaveLength(0);
  });

  test("Closed Case page has no color-contrast violations", async ({
    page,
  }) => {
    const testCase = await createTestCase(page, user, { isSolo: true });
    await advanceCaseToStatus(page, testCase.caseId, "CLOSED_RESOLVED");
    await page.goto(`/cases/${testCase.caseId}/closed`);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(
      results.violations,
      `Found ${results.violations.length} contrast violation(s) on Closed Case page`,
    ).toHaveLength(0);
  });
});

/**
 * WOR-80: Visual consistency pass — per-page screenshots.
 *
 * Navigates to each verified page and captures a screenshot to
 * docs/visual-pass/<page>.png. Asserts that the screenshot file exists
 * and is non-empty. No pixel-diff comparison — per the ticket, snapshot
 * diffs are too brittle; existence of the screenshot is sufficient.
 *
 * Acceptance criteria covered:
 *   - Verified pages are visually consistent (captured for manual review)
 *   - Per-page screenshot saved to docs/visual-pass/<page>.png
 */
import { test, expect } from "@playwright/test";
import {
  createTestUser,
  createTestAdminUser,
  loginAsUser,
  createTestCase,
  advanceCaseToStatus,
} from "../fixtures";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = path.resolve(__dirname, "../../docs/visual-pass");

/**
 * Ensure the screenshot output directory exists.
 */
test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

// ---------------------------------------------------------------------------
// Public pages — no auth required
// ---------------------------------------------------------------------------

test.describe("WOR-80: Visual pass — public pages", () => {
  test("/ (LandingPage)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "landing.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });

  test("/login (LoginPage)", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "login.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });

  test("/forbidden (Forbidden — non-admin hitting admin route)", async ({
    page,
  }) => {
    // The Forbidden component is rendered inline by AdminGuard when a
    // non-admin user accesses an admin route — there is no /forbidden route.
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto("/admin/templates");
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "forbidden.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Authenticated pages — require login + test data
// ---------------------------------------------------------------------------

test.describe("WOR-80: Visual pass — authenticated pages", () => {
  test("/dashboard (Dashboard)", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "dashboard.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });

  test("/cases/new (NewCasePage)", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto("/cases/new");
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "new-case.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });

  test("/cases/:id (CaseDetail)", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await page.goto(`/cases/${testCase.caseId}`);
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "case-detail.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });

  test("/cases/:id/private (PrivateCoachingPage)", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await page.goto(`/cases/${testCase.caseId}/private`);
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "private-coaching.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });

  test("/cases/:id/joint (JointChatPage)", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    // Advance to READY_FOR_JOINT so the joint chat page is accessible
    await advanceCaseToStatus(page, testCase.caseId, "READY_FOR_JOINT");
    // Then advance to JOINT_CHAT
    await advanceCaseToStatus(page, testCase.caseId, "JOINT_CHAT");

    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "joint-chat.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });

  test("/cases/:id/closed (ClosedCasePage)", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    // Advance through statuses to CLOSED_RESOLVED
    await advanceCaseToStatus(page, testCase.caseId, "CLOSED_RESOLVED");

    await page.goto(`/cases/${testCase.caseId}/closed`);
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "closed-case.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });

  test("/invite/:token (InviteAcceptPage)", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: false });

    // Use a real invite token if available, otherwise use the caseId
    // as a placeholder — the page should render even for invalid tokens
    const token = testCase.inviteToken ?? "test-token-placeholder";

    // Navigate as a non-logged-in user to see the invite page
    await page.goto(`/invite/${token}`);
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "invite-accept.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Admin pages — require admin login
// ---------------------------------------------------------------------------

test.describe("WOR-80: Visual pass — admin pages", () => {
  test("/admin/templates (TemplatesListPage)", async ({ page }) => {
    const admin = await createTestAdminUser(page);
    await loginAsUser(page, admin);

    await page.goto("/admin/templates");
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "admin-templates.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });

  test("/admin/templates/:id (TemplateEditPage)", async ({ page }) => {
    const admin = await createTestAdminUser(page);
    await loginAsUser(page, admin);

    // Navigate to the template list first to find a seeded template
    await page.goto("/admin/templates");
    await page.waitForLoadState("networkidle");

    // Click the first template link to navigate to its edit page
    const templateLink = page.locator("a[href^='/admin/templates/']").first();
    await templateLink.click();
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "admin-template-edit.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });

  test("/admin/audit (AuditLogPage)", async ({ page }) => {
    const admin = await createTestAdminUser(page);
    await loginAsUser(page, admin);

    await page.goto("/admin/audit");
    await page.waitForLoadState("networkidle");

    const screenshotPath = path.join(SCREENSHOT_DIR, "admin-audit.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    expect(fs.existsSync(screenshotPath)).toBe(true);
    expect(fs.statSync(screenshotPath).size).toBeGreaterThan(0);
  });
});

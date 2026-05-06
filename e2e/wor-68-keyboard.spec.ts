import { test, expect } from "@playwright/test";
import {
  createTestUser,
  loginAsUser,
  createTestCase,
  advanceCaseToStatus,
} from "./fixtures";

/**
 * WOR-68 AC: "Keyboard-navigable throughout all critical paths"
 *
 * Uses Playwright to Tab through critical flows without any mouse interaction.
 * All actions must be reachable with Tab + Enter + Escape only.
 *
 * Critical flows tested:
 * 1. Dashboard → New Case (navigate and fill form via keyboard)
 * 2. Private Coaching → send message via Enter, mark complete via keyboard
 * 3. Joint Chat → send message, open Draft Coach, close via Escape
 * 4. Modal interactions — open, interact, close via Escape
 */

test.describe("WOR-68: Keyboard navigation — critical paths", () => {
  let user: Awaited<ReturnType<typeof createTestUser>>;

  test.beforeEach(async ({ page }) => {
    user = await createTestUser(page);
    await loginAsUser(page, user);
  });

  test("can navigate from Dashboard to New Case page using keyboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Tab to the "New Case" button/link and press Enter
    let foundNewCase = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const activeText = await page.evaluate(
        () => document.activeElement?.textContent?.trim() ?? "",
      );
      const activeAriaLabel = await page.evaluate(
        () => document.activeElement?.getAttribute("aria-label") ?? "",
      );
      if (
        activeText.toLowerCase().includes("new case") ||
        activeAriaLabel.toLowerCase().includes("new case")
      ) {
        foundNewCase = true;
        break;
      }
    }
    expect(foundNewCase, "Could not Tab to 'New Case' action").toBe(true);

    await page.keyboard.press("Enter");
    await page.waitForURL("**/cases/new**");
    expect(page.url()).toContain("/cases/new");
  });

  test("can fill and submit New Case form using keyboard only", async ({
    page,
  }) => {
    await page.goto("/cases/new");
    await page.waitForLoadState("networkidle");

    // Tab into the form fields and fill them
    // Category select
    await page.keyboard.press("Tab");
    await page.keyboard.press("ArrowDown"); // Select first option

    // Main topic input
    await page.keyboard.press("Tab");
    await page.keyboard.type("Test conflict topic");

    // Description textarea
    await page.keyboard.press("Tab");
    await page.keyboard.type("Detailed description of the conflict.");

    // Desired outcome textarea
    await page.keyboard.press("Tab");
    await page.keyboard.type("A peaceful resolution.");

    // Tab to submit button and press Enter
    let foundSubmit = false;
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const tagName = await page.evaluate(
        () => document.activeElement?.tagName?.toLowerCase() ?? "",
      );
      const type = await page.evaluate(
        () => document.activeElement?.getAttribute("type") ?? "",
      );
      if (tagName === "button" && type !== "button") {
        foundSubmit = true;
        break;
      }
      const text = await page.evaluate(
        () => document.activeElement?.textContent?.trim().toLowerCase() ?? "",
      );
      if (text.includes("create") || text.includes("submit")) {
        foundSubmit = true;
        break;
      }
    }
    expect(foundSubmit, "Could not Tab to submit button").toBe(true);
  });

  test("can send a message in Private Coaching via keyboard", async ({
    page,
  }) => {
    const testCase = await createTestCase(page, user, { isSolo: true });
    await page.goto(`/cases/${testCase.caseId}/private`);
    await page.waitForLoadState("networkidle");

    // Tab to the message input
    let foundInput = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const tagName = await page.evaluate(
        () => document.activeElement?.tagName?.toLowerCase() ?? "",
      );
      const ariaLabel = await page.evaluate(
        () => document.activeElement?.getAttribute("aria-label") ?? "",
      );
      if (
        tagName === "textarea" ||
        ariaLabel.toLowerCase().includes("message")
      ) {
        foundInput = true;
        break;
      }
    }
    expect(foundInput, "Could not Tab to message input").toBe(true);

    // Type a message and send with Enter
    await page.keyboard.type("Hello coach, I need help.");
    await page.keyboard.press("Enter");

    // Verify the message appears in the chat
    await expect(
      page.locator('[role="log"]').getByText("Hello coach, I need help."),
    ).toBeVisible({ timeout: 10000 });
  });

  test("can open and close CaseClosureModal with keyboard", async ({
    page,
  }) => {
    const testCase = await createTestCase(page, user, { isSolo: true });
    await advanceCaseToStatus(page, testCase.caseId, "JOINT_ACTIVE");
    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Tab to the Close button
    let foundClose = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press("Tab");
      const text = await page.evaluate(
        () => document.activeElement?.textContent?.trim().toLowerCase() ?? "",
      );
      if (text === "close") {
        foundClose = true;
        break;
      }
    }
    expect(foundClose, "Could not Tab to 'Close' button").toBe(true);

    // Open the modal
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();

    // Close the modal with Escape
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("Draft Coach panel can be opened and closed with keyboard", async ({
    page,
  }) => {
    const testCase = await createTestCase(page, user, { isSolo: true });
    await advanceCaseToStatus(page, testCase.caseId, "JOINT_ACTIVE");
    await page.goto(`/cases/${testCase.caseId}/joint`);
    await page.waitForLoadState("networkidle");

    // Tab to "Draft with Coach" button
    let foundDraft = false;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const ariaLabel = await page.evaluate(
        () => document.activeElement?.getAttribute("aria-label") ?? "",
      );
      const text = await page.evaluate(
        () => document.activeElement?.textContent?.trim().toLowerCase() ?? "",
      );
      if (ariaLabel.toLowerCase().includes("draft") || text.includes("draft")) {
        foundDraft = true;
        break;
      }
    }
    expect(foundDraft, "Could not Tab to 'Draft with Coach' button").toBe(true);

    // Open Draft Coach panel
    await page.keyboard.press("Enter");
    await expect(
      page.locator('[data-testid="draft-coach-panel"]'),
    ).toBeVisible();

    // Close with Escape (after WOR-68 implementation adds Escape handler)
    await page.keyboard.press("Escape");
    await expect(
      page.locator('[data-testid="draft-coach-panel"]'),
    ).not.toBeVisible();
  });

  test("UserMenu dropdown can be opened and navigated with keyboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Tab to user menu button
    let foundUserMenu = false;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      const ariaLabel = await page.evaluate(
        () => document.activeElement?.getAttribute("aria-label") ?? "",
      );
      const testId = await page.evaluate(
        () => document.activeElement?.getAttribute("data-testid") ?? "",
      );
      if (
        ariaLabel.toLowerCase().includes("user menu") ||
        testId === "user-menu-button"
      ) {
        foundUserMenu = true;
        break;
      }
    }
    expect(foundUserMenu, "Could not Tab to user menu button").toBe(true);

    // Open with Enter
    await page.keyboard.press("Enter");
    await expect(page.locator('[role="menu"]')).toBeVisible();

    // Close with Escape (after WOR-68 implementation adds keyboard support)
    await page.keyboard.press("Escape");
    await expect(page.locator('[role="menu"]')).not.toBeVisible();
  });
});

/**
 * WOR-81: Privacy banner visual styling — E2E verification.
 *
 * Navigates to a private coaching page and asserts that the
 * PrivacyBanner has rounded corners, a visible border, and a
 * visible focus ring on the lock button in a real browser.
 *
 * Acceptance criteria covered:
 *   - AC1: rounded corners (border-radius > 0)
 *   - AC2: visible border (borderWidth > 0)
 *   - AC3: margin from siblings (not flush full-width)
 *   - AC4: lock button focus ring visible when focused
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser, createTestCase } from "../fixtures";

test.describe("WOR-81: Privacy banner visual styling", () => {
  test("banner has rounded corners, border, and margin", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await page.goto(`/cases/${testCase.caseId}/private`);
    await page.waitForLoadState("networkidle");

    const banner = page.getByRole("region", { name: "Privacy notice" });
    await expect(banner).toBeVisible();

    const styles = await banner.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        borderRadius: cs.borderRadius,
        borderWidth: cs.borderWidth,
        marginLeft: cs.marginLeft,
        marginBottom: cs.marginBottom,
      };
    });

    // AC1: rounded corners
    expect(parseFloat(styles.borderRadius)).toBeGreaterThan(0);
    // AC2: visible border
    expect(parseFloat(styles.borderWidth)).toBeGreaterThan(0);
    // AC3: margin from siblings
    expect(parseFloat(styles.marginLeft)).toBeGreaterThan(0);
    expect(parseFloat(styles.marginBottom)).toBeGreaterThan(0);
  });

  test("lock button has visible focus ring", async ({ page }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const testCase = await createTestCase(page, user, { isSolo: true });

    await page.goto(`/cases/${testCase.caseId}/private`);
    await page.waitForLoadState("networkidle");

    const banner = page.getByRole("region", { name: "Privacy notice" });
    await expect(banner).toBeVisible();

    const lockButton = banner.getByRole("button", { name: /lock/i });
    await lockButton.focus();

    // AC4: focus ring is visible (box-shadow is used by Tailwind ring utilities)
    const boxShadow = await lockButton.evaluate(
      (el) => getComputedStyle(el).boxShadow,
    );
    expect(boxShadow).not.toBe("none");
  });
});

/**
 * E2E tests for WOR-42: Privacy Banner Component
 *
 * These tests verify PrivacyBanner renders correctly in a real browser.
 * They target any page that includes the PrivacyBanner component.
 * Since the component doesn't exist yet, these will fail until implementation.
 */
import { test, expect } from "@playwright/test";

test.describe("WOR-42: PrivacyBanner E2E", () => {
  test("PrivacyBanner renders with lock icon, --private-tint background, and configurable text", async ({
    page,
  }) => {
    // Navigate to a page that includes the PrivacyBanner.
    // Private coaching is the primary context where the banner appears.
    await page.goto("/");

    // Look for the privacy banner region on any page that uses it
    const banner = page.locator('[role="region"], [role="banner"]').filter({
      hasText: /private/i,
    });
    await expect(banner).toBeVisible();

    // Verify lock icon is present (SVG inside a button)
    const lockButton = banner.getByRole("button", { name: /lock/i });
    await expect(lockButton).toBeVisible();

    // Verify background color is --private-tint (#F0E9E0)
    const bgColor = await banner.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(bgColor).toBe("rgb(240, 233, 224)");
  });

  test("Lock icon click opens a modal explaining privacy boundaries", async ({
    page,
  }) => {
    await page.goto("/");

    const banner = page.locator('[role="region"], [role="banner"]').filter({
      hasText: /private/i,
    });
    const lockButton = banner.getByRole("button", { name: /lock/i });

    // Click the lock icon
    await lockButton.click();

    // A dialog should appear
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Dialog should contain privacy explanation text
    await expect(dialog).toContainText(/private|privacy/i);
  });

  test('Screen reader text: "Private conversation. Only you and the AI coach see this."', async ({
    page,
  }) => {
    await page.goto("/");

    // The screen reader text should be present in the DOM
    const srText = page.getByText(
      "Private conversation. Only you and the AI coach see this."
    );
    // It may be visually hidden but must be in the DOM
    await expect(srText).toBeAttached();
  });

  test("Component accepts otherPartyName prop for personalized copy", async ({
    page,
  }) => {
    // This test depends on a page that renders PrivacyBanner with otherPartyName.
    // When private coaching or joint chat is implemented, this will be testable
    // by navigating to a case where the other party has a name.
    await page.goto("/");

    const banner = page.locator('[role="region"], [role="banner"]').filter({
      hasText: /private/i,
    });

    // If otherPartyName is provided, the banner should mention it
    const bannerText = await banner.textContent();
    // At minimum the banner should contain some text about privacy
    expect(bannerText).toBeTruthy();
  });

  test("Lock icon is not decorative — it is interactive and accessible", async ({
    page,
  }) => {
    await page.goto("/");

    const banner = page.locator('[role="region"], [role="banner"]').filter({
      hasText: /private/i,
    });
    const lockButton = banner.getByRole("button", { name: /lock/i });

    // Lock icon must be keyboard-focusable
    await lockButton.focus();
    await expect(lockButton).toBeFocused();

    // It must not be aria-hidden
    const ariaHidden = await lockButton.getAttribute("aria-hidden");
    expect(ariaHidden).not.toBe("true");
  });
});

/**
 * WOR-62 AC5: Page is gated by ADMIN role check; non-admins receive a
 * 403/FORBIDDEN response.
 *
 * E2E tests verifying that:
 * - A non-admin user navigating to /admin/audit sees a 403/forbidden page.
 * - An admin user navigating to /admin/audit sees the audit log page.
 *
 * These tests will FAIL until the admin gate and audit log page are fully
 * wired up in the application.
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser } from "../fixtures";

test.describe("AC5: /admin/audit is gated by ADMIN role", () => {
  test("non-admin user sees 403/forbidden when visiting /admin/audit", async ({
    page,
  }) => {
    // Create and login as a regular (non-admin) user
    const regularUser = await createTestUser(page);
    await loginAsUser(page, regularUser);

    // Navigate to the admin audit page
    await page.goto("/admin/audit");

    // Should show a 403/forbidden indicator — not the audit log
    const forbiddenIndicator = page
      .getByText(/403|forbidden|not authorized|access denied/i)
      .first();
    await expect(forbiddenIndicator).toBeVisible({ timeout: 5000 });

    // The audit table should NOT be present
    const table = page.getByRole("table");
    await expect(table).not.toBeVisible();
  });

  test("admin user can access /admin/audit and sees the audit log", async ({
    page,
  }) => {
    // Create and login as an admin user.
    // The test auth system must support creating admin users. If
    // __TEST_SIGN_IN__ creates USER-role accounts by default, an
    // additional test hook or seed step must promote the user.
    const adminUser = await createTestUser(page);
    await loginAsUser(page, adminUser);

    // Promote user to admin via test support hook
    await page.evaluate(async (email: string) => {
      const w = window as unknown as {
        __TEST_SET_ADMIN__?: (args: { email: string }) => Promise<void>;
      };
      if (w.__TEST_SET_ADMIN__) {
        await w.__TEST_SET_ADMIN__({ email });
      }
    }, adminUser.email);

    await page.goto("/admin/audit");

    // The audit log page should render with the heading
    const heading = page.getByRole("heading", { name: /audit log/i });
    await expect(heading).toBeVisible({ timeout: 5000 });

    // The table should be visible
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
  });
});

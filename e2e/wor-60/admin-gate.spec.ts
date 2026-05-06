/**
 * WOR-60 E2E: Admin role gate
 *
 * AC8: All operations are gated by ADMIN role check
 *
 * Tests that non-admin users see a 403/Forbidden page when navigating
 * to /admin/templates, and admin users see the template list page.
 */
import { test, expect } from "@playwright/test";
import { createTestUser, loginAsUser, type TestUser } from "../fixtures";

test.describe("AC8: Admin role gate for template pages", () => {
  test("non-admin user sees 403 Forbidden on /admin/templates", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto("/admin/templates");

    // Should show the Forbidden page (403 text)
    await expect(page.getByText("403")).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(/do not have permission|forbidden|not authorized/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test("non-admin user sees 403 Forbidden on /admin/templates/:id", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);

    await page.goto("/admin/templates/some-template-id");

    await expect(page.getByText("403")).toBeVisible({ timeout: 5000 });
  });

  test("admin user can access /admin/templates and sees the page content", async ({
    page,
  }) => {
    // Use the seed-data admin user from WOR-64 (convex/seed.ts)
    const adminUser: TestUser = {
      email: "admin@conflictcoach.dev",
      password: "admin-seed-password",
      name: "Admin",
    };
    await loginAsUser(page, adminUser);

    await page.goto("/admin/templates");

    // Should NOT show 403
    await expect(page.getByText("403")).toBeHidden({ timeout: 5000 });

    // Should show the template management page
    await expect(page.getByText(/templates/i)).toBeVisible({ timeout: 5000 });
  });
});

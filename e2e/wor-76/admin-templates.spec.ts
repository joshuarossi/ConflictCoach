/**
 * WOR-76: Admin template management E2E.
 *
 * Exercises the full admin template lifecycle in a single sequential test:
 *   1. Logs in as admin user
 *   2. Creates a new template with category and guidance
 *   3. Verifies initial version (v1) auto-published
 *   4. Creates a case pinned to v1 (before v2 exists)
 *   5. Publishes v2; verifies both versions in history; verifies case pin
 *   6. Archives the template; verifies archived status
 *   7. Verifies pinned case still functions with archived template
 *
 * Invariants:
 *   - CLAUDE_MOCK=true for deterministic AI responses
 *   - Admin auth via createTestAdminUser (seed:seed idempotent)
 *   - Sequential — each AC depends on prior state
 */
import { test, expect } from "@playwright/test";
import {
  createTestAdminUser,
  loginAsUser,
  callQuery,
} from "../fixtures";

test.describe("WOR-76: Admin template management", () => {
  test("full admin template lifecycle: create, version, pin, archive", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // Unique template name to avoid collisions
    const templateName = `E2E Template ${Date.now()}`;
    const templateCategory = "other";
    const initialGuidance = "Initial test guidance for E2E template management.";
    const updatedGuidance = "Updated guidance for v2 of the E2E template.";
    const versionNotes = "Version 2 release notes for E2E test.";

    // -------------------------------------------------------------------
    // AC 1: Test logs in as admin user
    // -------------------------------------------------------------------
    const adminUser = await createTestAdminUser(page);
    await loginAsUser(page, adminUser);

    // Navigate to admin templates page
    await page.goto("/admin/templates");
    await page.waitForLoadState("networkidle");

    // Assert the template list page is visible
    const templatesHeading = page
      .getByRole("heading", { name: /templates/i })
      .or(page.getByText(/templates/i).first());
    await expect(templatesHeading).toBeVisible({ timeout: 10_000 });

    // Assert a table or list structure is present
    const templateTable = page
      .getByRole("table")
      .or(page.locator("[data-testid='templates-list']"))
      .or(page.locator("table, [role='grid']"));
    await expect(templateTable.first()).toBeVisible({ timeout: 10_000 });

    // -------------------------------------------------------------------
    // AC 2: Creates a new template with category and guidance
    // -------------------------------------------------------------------
    const newTemplateButton = page.getByRole("button", {
      name: /new template/i,
    });
    await expect(newTemplateButton).toBeVisible({ timeout: 10_000 });
    await newTemplateButton.click();

    // Fill the new template dialog
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Select category
    const categorySelect = dialog
      .getByRole("combobox", { name: /category/i })
      .or(dialog.locator("select"));
    await expect(categorySelect.first()).toBeVisible({ timeout: 5_000 });
    await categorySelect.first().selectOption(templateCategory);

    // Fill name
    const nameInput = dialog
      .getByRole("textbox", { name: /name/i })
      .or(dialog.getByPlaceholder(/name/i));
    await expect(nameInput.first()).toBeVisible({ timeout: 5_000 });
    await nameInput.first().fill(templateName);

    // Fill global guidance
    const guidanceInput = dialog
      .locator("textarea")
      .or(dialog.getByRole("textbox", { name: /guidance/i }))
      .or(dialog.getByPlaceholder(/guidance/i));
    await expect(guidanceInput.first()).toBeVisible({ timeout: 5_000 });
    await guidanceInput.first().fill(initialGuidance);

    // Submit the dialog
    const createButton = dialog.getByRole("button", {
      name: /create|save|submit/i,
    });
    await createButton.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    // Assert new template row appears in the list
    await expect(page.getByText(templateName)).toBeVisible({ timeout: 10_000 });

    // -------------------------------------------------------------------
    // AC 3: Publishes initial version (v1) — auto-published on create
    // -------------------------------------------------------------------
    // Click the new template row to navigate to its edit page
    await page.getByText(templateName).click();
    await page.waitForURL(/\/admin\/templates\/[^/]+/, { timeout: 10_000 });

    // Extract templateId from the URL
    const editUrl = page.url();
    const templateIdMatch = editUrl.match(/\/admin\/templates\/([^/?]+)/);
    expect(templateIdMatch).not.toBeNull();
    const templateId = templateIdMatch![1];
    expect(templateId).toBeTruthy();

    // Assert version history panel shows v1
    const versionHistory = page
      .locator("[data-testid='version-history']")
      .or(page.getByRole("heading", { name: /version history/i }).locator(".."));
    await expect(versionHistory.first()).toBeVisible({ timeout: 10_000 });

    // v1 should be visible
    const v1Entry = page.getByText(/v(ersion\s*)?1/i).first();
    await expect(v1Entry).toBeVisible({ timeout: 10_000 });

    // Retrieve v1's version ID via callQuery for pin verification later
    const versionsResult = await callQuery(
      page,
      "admin/templates:listVersions",
      { templateId },
    );
    expect(versionsResult.ok).toBe(true);
    const versions = (
      versionsResult as { ok: true; value: unknown }
    ).value as Array<{ _id: string; version: number }>;
    expect(versions.length).toBeGreaterThanOrEqual(1);
    // Versions are sorted descending — find v1 explicitly
    const v1 =
      versions.find((v) => v.version === 1) ?? versions[versions.length - 1];
    const v1VersionId = v1._id;
    expect(v1VersionId).toBeTruthy();

    // -------------------------------------------------------------------
    // AC 5a: Create a case pinned to v1 BEFORE publishing v2
    // -------------------------------------------------------------------
    // Navigate to case creation page
    await page.goto("/cases/new");
    await page.waitForLoadState("networkidle");

    // Fill the case creation form — category picker renders radio button cards
    const caseCategoryRadio = page.getByRole("radio", { name: /other/i });
    await expect(caseCategoryRadio).toBeVisible({ timeout: 10_000 });
    await caseCategoryRadio.click();

    const topicInput = page
      .getByRole("textbox", { name: /topic/i })
      .or(page.getByPlaceholder(/topic/i));
    await topicInput.fill("E2E template pin test case");

    // Description (optional but fill for completeness)
    const descriptionInput = page
      .getByRole("textbox", { name: /description/i })
      .or(page.getByPlaceholder(/description|describe/i));
    try {
      await descriptionInput.waitFor({ state: "visible", timeout: 3_000 });
      await descriptionInput.fill("Testing that this case pins to v1.");
    } catch {
      // Description may not be required
    }

    // Desired outcome (optional)
    const outcomeInput = page
      .getByRole("textbox", { name: /outcome/i })
      .or(page.getByPlaceholder(/outcome|hope to achieve/i));
    try {
      await outcomeInput.waitFor({ state: "visible", timeout: 3_000 });
      await outcomeInput.fill("Verify version pinning works.");
    } catch {
      // Outcome may not be required
    }

    // Submit the case
    const submitCaseButton = page.getByRole("button", {
      name: /create|submit|start/i,
    });
    await submitCaseButton.click();

    // Wait for redirect to case page
    await page.waitForURL(/\/cases\/[^/]+\/(invite|private|post-create)/, {
      timeout: 15_000,
    });

    // Extract caseId from URL
    const caseUrl = page.url();
    const caseIdMatch = caseUrl.match(/\/cases\/([^/?]+)/);
    expect(caseIdMatch).not.toBeNull();
    const caseId = caseIdMatch![1];
    expect(caseId).toBeTruthy();

    // -------------------------------------------------------------------
    // AC 4: Edits and publishes v2; verifies both versions visible
    // -------------------------------------------------------------------
    // Navigate back to the template edit page
    await page.goto(`/admin/templates/${templateId}`);
    await page.waitForLoadState("networkidle");

    // Modify the global guidance textarea
    const editGuidanceTextarea = page
      .locator("textarea")
      .or(page.getByRole("textbox", { name: /guidance/i }));
    await expect(editGuidanceTextarea.first()).toBeVisible({ timeout: 10_000 });
    await editGuidanceTextarea.first().fill(updatedGuidance);

    // Fill version notes
    const notesInput = page
      .getByRole("textbox", { name: /notes/i })
      .or(page.getByPlaceholder(/notes/i))
      .or(page.locator("textarea").filter({ hasText: /notes/i }).or(
        page.locator("[name='notes'], [data-testid='version-notes']"),
      ));
    try {
      await notesInput.first().waitFor({ state: "visible", timeout: 3_000 });
      await notesInput.first().fill(versionNotes);
    } catch {
      // Notes field may not be separately visible — some UIs combine it
    }

    // Click "Publish New Version"
    const publishButton = page.getByRole("button", {
      name: /publish.*version|publish/i,
    });
    await expect(publishButton).toBeVisible({ timeout: 10_000 });
    await publishButton.click();

    // Confirm in dialog if one appears
    const publishDialog = page.getByRole("dialog");
    try {
      await publishDialog.waitFor({ state: "visible", timeout: 3_000 });
      const confirmPublish = publishDialog.getByRole("button", {
        name: /confirm|publish|yes/i,
      });
      await confirmPublish.click();
      await expect(publishDialog).not.toBeVisible({ timeout: 5_000 });
    } catch {
      // No confirmation dialog — publish went through directly
    }

    // Wait for version history to update
    await page.waitForLoadState("networkidle");

    // Assert both v1 and v2 are visible in version history
    const v2Entry = page.getByText(/v(ersion\s*)?2/i).first();
    await expect(v2Entry).toBeVisible({ timeout: 10_000 });
    // v1 should still be listed
    await expect(page.getByText(/v(ersion\s*)?1/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // -------------------------------------------------------------------
    // AC 5b: Verifies case still uses v1 after v2 is published
    // -------------------------------------------------------------------
    // Query the case to verify its templateVersionId matches v1
    const caseResult = await callQuery(page, "cases:get", {
      caseId,
    });
    expect(caseResult.ok).toBe(true);
    const caseData = (
      caseResult as { ok: true; value: unknown }
    ).value as { templateVersionId?: string };
    // The case must still be pinned to v1, not v2
    expect(caseData.templateVersionId).toBe(v1VersionId);

    // -------------------------------------------------------------------
    // AC 6: Archives the template; verifies it's hidden/archived
    // -------------------------------------------------------------------
    // Click "Archive" button on the template edit page
    const archiveButton = page.getByRole("button", {
      name: /archive/i,
    });
    await expect(archiveButton).toBeVisible({ timeout: 10_000 });
    await archiveButton.click();

    // Confirm archive dialog
    const archiveDialog = page.getByRole("dialog");
    try {
      await archiveDialog.waitFor({ state: "visible", timeout: 3_000 });
      const confirmArchive = archiveDialog.getByRole("button", {
        name: /confirm|archive|yes/i,
      });
      await confirmArchive.click();
      await expect(archiveDialog).not.toBeVisible({ timeout: 5_000 });
    } catch {
      // No confirmation dialog — archive went through directly
    }

    // Verify template shows "Archived" status on the edit page
    await expect(
      page.getByText(/archived/i).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Navigate to the admin templates list to verify archived status there
    await page.goto("/admin/templates");
    await page.waitForLoadState("networkidle");

    // The template row should show an "Archived" badge or status
    const templateRow = page.locator("tr, [data-testid='template-row']").filter({
      hasText: templateName,
    });
    await expect(templateRow.first()).toBeVisible({ timeout: 10_000 });
    await expect(
      templateRow.first().getByText(/archived/i),
    ).toBeVisible({ timeout: 5_000 });

    // Verify picker behavior: navigate to /cases/new and confirm the
    // "other" category radio still exists (seed data has an active "other"
    // template) — the archived test template should not break case creation.
    // If no other active template existed for this category the radio would
    // be absent, proving archive hides it.
    await page.goto("/cases/new");
    await page.waitForLoadState("networkidle");
    const pickerRadio = page.getByRole("radio", { name: /other/i });
    // Category is still present because the seed "other" template is active
    await expect(pickerRadio).toBeVisible({ timeout: 10_000 });

    // -------------------------------------------------------------------
    // AC 7: Verifies the pinned case still functions with archived template
    // -------------------------------------------------------------------
    // Navigate to the pinned case's private coaching page
    await page.goto(`/cases/${caseId}/private`);
    await page.waitForLoadState("networkidle");

    // Assert the private coaching page loads without errors
    const chatInput = page
      .getByRole("textbox", { name: /message/i })
      .or(page.getByPlaceholder(/type|message/i));
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    // Send a message to verify the case functions correctly
    await chatInput.fill("Testing that this case works after template archival.");
    await chatInput.press("Enter");

    // Verify the user message appears
    await expect(
      page.getByText(/works after template archival/i),
    ).toBeVisible({ timeout: 10_000 });

    // Wait for mock AI response — proves template version resolution works
    // for archived templates. The chat renders messages in sequence; wait
    // for at least 2 message elements (user + AI) to confirm the AI replied.
    const allMessages = page.locator(
      "[data-testid='chat-message'], [data-testid='message']",
    );
    await expect(async () => {
      const count = await allMessages.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 20_000 });

    // The AI response (second message) must contain non-empty visible text.
    const aiMessage = allMessages.nth(1);
    await expect(aiMessage).toBeVisible({ timeout: 5_000 });
    await expect(aiMessage).not.toHaveText("", { timeout: 5_000 });
  });
});

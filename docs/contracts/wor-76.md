---
task_id: WOR-76
ticket_summary: "E2E test: admin template management"
ac_refs:
  - "Test logs in as admin user"
  - "Creates a new template with category and guidance"
  - "Publishes initial version (v1)"
  - "Edits and publishes v2; verifies both versions visible in history"
  - "Creates a case pinned to v1; verifies case still uses v1 after v2 is published"
  - "Archives the template; verifies it's hidden from the category picker"
  - "Verifies the pinned case still functions correctly with the archived template"
files:
  - path: e2e/wor-76/admin-templates.spec.ts
    role: test-infrastructure
    action: create
    exports:
      - "Playwright test suite: 'WOR-76: Admin template management' — test.describe block with one sequential test exercising the full admin template lifecycle: create, publish, version, pin, archive, and post-archive case validation"
signatures:
  - "No public API signatures — this is a test file only"
queries_used:
  - "api.admin.templates.listAll — query consumed by TemplatesListPage to render all templates (including archived) with currentVersion and pinnedCasesCount"
  - "api.admin.templates.get — query consumed by TemplateEditPage to render a single template's metadata"
  - "api.admin.templates.listVersions — query consumed by TemplateEditPage to render version history timeline (version number, timestamp, publisher name, notes)"
  - "api.admin.templates.create — mutation called when admin submits the 'New Template' dialog on TemplatesListPage; args: category, name, globalGuidance, coachInstructions?, draftCoachInstructions?"
  - "api.admin.templates.publishNewVersion — mutation called when admin clicks 'Publish New Version' on TemplateEditPage; args: templateId, globalGuidance, coachInstructions?, draftCoachInstructions?, notes?"
  - "api.admin.templates.archive — mutation called when admin confirms archive on TemplateEditPage; args: templateId"
  - "api.cases.create.create — mutation consumed by NewCasePage to create a case pinned to the active template version; args: category, mainTopic, description?, desiredOutcome?, isSolo?"
  - "api.cases.get — query consumed by case detail pages to render case state"
  - "api.privateCoaching.myMessages — query consumed by PrivateCoachingPage to render private chat messages"
  - "api.privateCoaching.sendUserMessage — mutation called when user sends a message in private coaching"
invariants:
  - "Admin-only route gate — /admin/templates and /admin/templates/:id are only accessible to users with role ADMIN; non-admin access results in a 403 or redirect"
  - "CLAUDE_MOCK=true must be active — test-mode Password provider, testSupport mutations, and mock AI responses are gated on this flag"
  - "Template version immutability — publishing a new version creates a new templateVersions row; existing versions are never modified"
  - "Case version pinning — cases record templateVersionId at creation time; this field is immutable and unaffected by subsequent template edits or archiving"
  - "Archive hides from picker only — archiving sets archivedAt timestamp; archived templates disappear from the category picker in /cases/new but remain resolvable by pinned cases"
  - "Pinned case functionality survives archiving — a case pinned to an archived template's version continues to load and function (private coaching, AI responses) as if the template were still active"
  - "Version numbering is monotonic — v1, v2, etc., auto-incremented per template; version history displays newest first"
non_goals:
  - "Non-admin access denial test — verifying that a regular user gets 403 on /admin/* is a single assertion but is NOT an explicit AC; include only if trivially achievable without a second user context"
  - "Template editing of name/category — the create mutation sets these; the edit page only publishes new version content (guidance fields + notes)"
  - "Audit log verification — audit log entries are created by mutations but the AuditLogPage (/admin/audit) is a separate concern"
  - "Two-party case flow — the pinned case only needs to load and accept a private coaching message to prove it works; no need to exercise joint chat, synthesis, or closure"
  - "Template unarchive — there is no unarchive mutation in the codebase"
  - "Multiple templates per category — the test creates one template in a specific category; it does not test category collision or ordering"
tested_by:
  - ac: "Test logs in as admin user"
    layer: e2e
    file: e2e/wor-76/admin-templates.spec.ts
    reason: "Uses createTestAdminUser fixture to seed admin@conflictcoach.dev via seed:seed mutation, then loginAsUser; asserts /admin/templates loads with the template list table visible"
  - ac: "Creates a new template with category and guidance"
    layer: e2e
    file: e2e/wor-76/admin-templates.spec.ts
    reason: "Clicks 'New Template' button on TemplatesListPage, fills dialog form (category, name, globalGuidance), submits. Asserts new template row appears in the table with the correct name and category"
  - ac: "Publishes initial version (v1)"
    layer: e2e
    file: e2e/wor-76/admin-templates.spec.ts
    reason: "Navigates to /admin/templates/:id after creation. The create mutation auto-publishes v1. Asserts version history panel shows v1 with timestamp and admin name"
  - ac: "Edits and publishes v2; verifies both versions visible in history"
    layer: e2e
    file: e2e/wor-76/admin-templates.spec.ts
    reason: "Modifies globalGuidance textarea, adds version notes, clicks 'Publish New Version'. Asserts version history shows both v1 and v2; v2 is listed first (newest) and shows updated content"
  - ac: "Creates a case pinned to v1; verifies case still uses v1 after v2 is published"
    layer: e2e
    file: e2e/wor-76/admin-templates.spec.ts
    reason: "Version pin verification requires backend state inspection — the UI does not expose templateVersionId directly. Uses callMutation to create a case pinned to the template's category BEFORE publishing v2, then after v2 is published, uses callMutation to query the case and assert its templateVersionId matches v1's ID, not v2's. Alternatively: create the case via the case creation UI between v1 publish and v2 publish"
  - ac: "Archives the template; verifies it's hidden from the category picker"
    layer: e2e
    file: e2e/wor-76/admin-templates.spec.ts
    reason: "Clicks archive button on TemplateEditPage, confirms in dialog. Navigates to /cases/new and verifies the archived template's category is NOT among the category picker options (radio buttons). Must use a non-standard category to isolate from seed templates"
  - ac: "Verifies the pinned case still functions correctly with the archived template"
    layer: e2e
    file: e2e/wor-76/admin-templates.spec.ts
    reason: "Navigates to the case created earlier (pinned to the now-archived template). Asserts the case detail page loads without errors. Sends a private coaching message and verifies mock AI response streams correctly — proving the case is fully functional despite the template being archived"
---

# Contract: WOR-76 — E2E test: admin template management

## Why this work exists

Template versioning is a critical safety mechanism in Conflict Coach: cases are pinned to a specific template version at creation time, ensuring that admin edits to coaching guidance never retroactively alter the AI behavior for in-flight cases. This E2E test validates the entire admin template lifecycle — create, publish, version, pin verification, archive, and post-archive case functionality — end-to-end in a real browser. It directly addresses launch criterion 7.1.5: "Admin can create, edit, version, and archive a template without breaking existing cases."

## Files and exports

### `e2e/wor-76/admin-templates.spec.ts` (create, test-infrastructure)

Single Playwright spec file containing one `test.describe` block with one long sequential test. The test must be sequential because each AC depends on the prior step's state (create template → publish v1 → publish v2 → create pinned case → archive → verify). Follows the project convention from `e2e/wor-72/solo-full-flow.spec.ts` and `e2e/wor-73/invite-flow.spec.ts`: imports from `../fixtures`, uses `createTestAdminUser` + `loginAsUser` for admin auth setup.

**Critical decision: admin auth via `createTestAdminUser` fixture.** The test uses `createTestAdminUser(page)` which calls the `seed:seed` mutation (idempotent) to ensure admin@conflictcoach.dev exists, then returns credentials for `loginAsUser`. This is the established pattern — the seed mutation creates the admin user with `role: "ADMIN"`.

**Critical decision: use a unique category to isolate from seed data.** The seed script creates 3 default templates (workplace, family, personal). To cleanly test archive-hides-from-picker without seed data interference, the test should use a category that seed data does NOT populate — specifically `"other"` or `"contractual"`. This way, after archiving the test's template, the category genuinely disappears from the picker. If "other" has a seed template, the test creates a template with category `"contractual"` (seed data covers: workplace, family, personal, contractual, other — all 5). The test must check which categories the seed populates and choose accordingly, OR use `callMutation` to verify archive state rather than relying on picker absence.

**Alternative approach for archive-picker test:** Since seed data may populate all 5 categories, the test can verify archive behavior by: (1) confirming the template's category IS in the picker before archiving, (2) archiving, (3) confirming the category is STILL in the picker if other active templates share the category, OR is gone if this was the only active template for that category. The key assertion is that the *archived template* no longer resolves as the active template for case creation — if a case is created with that category after archive, it should either fail (no active template) or pin to a different template.

**Critical decision: version pinning verification uses `callMutation` for backend inspection.** The UI does not display `templateVersionId` anywhere. To verify that a case created under v1 still references v1 after v2 is published, the test must either: (a) use `callMutation` to call a query that returns the case's `templateVersionId` and compare it against v1's known ID, or (b) rely on indirect evidence (the case still functions with v1's guidance content). Option (a) is more precise and is the contracted approach. The test creates the case between v1 and v2 publication using the case creation UI, extracts the caseId from the redirect URL, then after v2 publish queries the case to verify the pinned version.

**Critical decision: pinned case functionality verified via private coaching.** AC7 says "the pinned case still functions correctly with the archived template." The minimal verification is: navigate to the case's private coaching page, send a message, and confirm the mock AI response streams. This proves the case resolves its template version (for prompt assembly) despite the template being archived.

## Data dependencies

### `api.admin.templates.create` (mutation)
Called when admin submits the "New Template" dialog. Args: `{ category: string, name: string, globalGuidance: string, coachInstructions?: string, draftCoachInstructions?: string, notes?: string }`. Creates a `templates` row AND auto-publishes v1 (creates a `templateVersions` row, patches `currentVersionId`). Returns `templateId`. The test extracts the templateId from the redirect to `/admin/templates/:id`.

### `api.admin.templates.listAll` (query)
Called by TemplatesListPage. Returns all templates with: `_id`, `category`, `name`, `currentVersionId`, `archivedAt`, `currentVersion` (version number), `pinnedCasesCount`. The test asserts the new template appears in the list.

### `api.admin.templates.get` (query)
Called by TemplateEditPage. Args: `{ templateId }`. Returns single template with `pinnedCasesCount`. The test navigates to this page to edit, publish, and archive.

### `api.admin.templates.listVersions` (query)
Called by TemplateEditPage. Args: `{ templateId }`. Returns versions sorted descending: `{ _id, version, globalGuidance, coachInstructions?, draftCoachInstructions?, publishedAt, publishedByName?, notes? }`. The test asserts v1 and v2 are both visible in the version history timeline.

### `api.admin.templates.publishNewVersion` (mutation)
Called when admin clicks "Publish New Version." Args: `{ templateId, globalGuidance, coachInstructions?, draftCoachInstructions?, notes? }`. Creates new `templateVersions` row with `version = previousMax + 1`, updates template's `currentVersionId`. Returns `versionId`.

### `api.admin.templates.archive` (mutation)
Called when admin confirms archive. Args: `{ templateId }`. Patches `archivedAt = Date.now()`. Throws `CONFLICT` if already archived.

### `api.cases.create.create` (mutation)
Called via case creation UI or `callMutation`. The case records `templateVersionId = template.currentVersionId` at creation time. This is the immutable pin. The test creates a case while v1 is current (before v2 publish) and later verifies the pin survived.

## Invariants

**Admin-only access.** All `api.admin.templates.*` mutations and queries check `isAdmin(user)` and throw `FORBIDDEN` if the caller is not an admin. The TemplatesListPage and TemplateEditPage are at `/admin/templates` and `/admin/templates/:id`. The test logs in as the seeded admin user.

**Version immutability.** Each `templateVersions` row is write-once. The `globalGuidance`, `coachInstructions`, `draftCoachInstructions`, and `notes` fields are set at insert time and never patched. Publishing a new version inserts a new row; it never modifies existing versions. The test verifies this by checking that v1's content is unchanged after v2 is published.

**Case version pinning is immutable.** The `templateVersionId` field on a `cases` row is set at creation time by `cases/create` and is never updated by any mutation. This is the core safety contract. The test creates a case while v1 is the active version, then publishes v2, and asserts the case's `templateVersionId` still equals v1's `_id`.

**Archive is soft-delete.** Archiving sets `archivedAt` on the template. The `cases/create` mutation filters out archived templates: `templates.find(t => !t.archivedAt)`. A case already pinned to a version of an archived template is unaffected — `templateVersions` rows are not modified or deleted. The test proves this by successfully interacting with a case pinned to an archived template's version.

**Version numbering.** Versions are numbered `1, 2, 3, ...` monotonically per template. The `publishNewVersion` mutation computes `nextVersion = existingVersions.length + 1`. The version history timeline in TemplateEditPage displays versions in descending order (newest first).

## Edge cases

**Seed data templates.** The `seed:seed` mutation creates templates for all 5 categories (workplace, family, personal, contractual, other). The test's new template shares a category with an existing seed template. When the test archives its template, the category may still appear in the picker because the seed's template for that category is still active. The test should use a category where it can control visibility — or verify archive behavior by checking that case creation with that category resolves to a *different* template after archive. The cleanest approach: create the template with `"other"` category, verify it appears, archive it, and verify the category still appears (because the seed's "other" template is active) but the *archived template name* is no longer selectable. If the picker shows categories (not template names), the archive-hides test needs to check that creating a case still succeeds (it picks the seed template instead). This is an inherent limitation of the current picker design: it shows categories, not templates. The contract resolves this: the test verifies archive behavior primarily through the admin UI (template row shows "Archived" status badge and form is disabled) plus the backend invariant (archived template is skipped during case creation). The picker assertion checks that the admin-only template list shows the template as archived.

**Create mutation auto-publishes v1.** When the admin creates a template via the dialog, the `create` mutation inserts both the `templates` row and the first `templateVersions` row (v1). The test does NOT need to separately "publish v1" — it's automatic. AC3 ("Publishes initial version v1") is verified by navigating to the edit page and asserting v1 appears in the version history.

**TemplateEditPage pre-fills from latest version.** The edit form initializes its fields from `listVersions[0]` (latest version). After v1 is published, the form shows v1's content. After v2, it shows v2's. The test modifies the pre-filled `globalGuidance` and adds notes before clicking "Publish New Version."

**Case creation between v1 and v2.** The test must create the case AFTER v1 exists (template is active) but BEFORE v2 is published. This means the case creation step is interleaved in the middle of the template management sequence: create template → (v1 auto-published) → create case → publish v2 → verify pin. The test navigates away from /admin/templates/:id to /cases/new, creates the case, then navigates back to continue the template management flow.

**Private coaching with mock AI.** The pinned-case-still-works verification sends a message in private coaching and waits for the mock AI response. The mock responder (`claudeMock.ts`) returns deterministic text regardless of template content. The test asserts a response appears (non-empty, status complete), not that it matches specific guidance text.

**Archive confirmation dialog.** The TemplateEditPage shows a confirmation dialog before archiving, warning about pinned cases. The test must click through this confirmation.

## Non-goals

- **Non-admin access denial.** Verifying 403/redirect for non-admin users on `/admin/*` routes is not an explicit AC. A quick assertion could be added but is not contracted.
- **Audit log verification.** The mutations log `TEMPLATE_CREATED`, `TEMPLATE_PUBLISHED`, `TEMPLATE_ARCHIVED` to the audit log, but verifying entries on `/admin/audit` is a separate concern.
- **Full case lifecycle.** The pinned case only needs to load and handle one private coaching exchange. No need for synthesis, joint chat, draft coach, or closure.
- **Template unarchive.** No unarchive mutation exists in the codebase.
- **Multi-template category management.** The test creates one template; it does not test multiple templates per category or template ordering.
- **Version content diff or "View" modal.** The version history has "View" buttons that open a read-only modal. Clicking through these is not an AC.

## Test coverage

| AC | Test layer | Verification approach |
|----|-----------|----------------------|
| Test logs in as admin user | e2e | Call `createTestAdminUser(page)` to seed admin via `seed:seed`. Call `loginAsUser(page, adminUser)`. Navigate to `/admin/templates`. Assert template list table is visible (e.g., heading "Templates" or table element). |
| Creates a new template with category and guidance | e2e | Click "New Template" button. In dialog: select category (e.g., "other"), fill name (`"E2E Test Template"`), fill globalGuidance (`"Test guidance for E2E"`). Submit. Assert dialog closes. Assert new template row appears in the table with the name and category. |
| Publishes initial version (v1) | e2e | Click the new template row to navigate to `/admin/templates/:id`. Assert version history panel shows exactly one entry: "Version 1" (or "v1") with a timestamp and "Admin" as publisher. This verifies auto-publish on create. |
| Edits and publishes v2; verifies both versions visible in history | e2e | Modify globalGuidance textarea to new content (`"Updated guidance v2"`). Fill notes textarea (`"Version 2 release notes"`). Click "Publish New Version". Assert version history shows two entries. Assert v2 is listed first (newest) with notes visible. Assert v1 is still listed below v2. |
| Creates a case pinned to v1; verifies case still uses v1 after v2 is published | e2e | **Timing:** Create the case BETWEEN v1 auto-publish and v2 manual publish. After verifying v1 in history (AC3), navigate to `/cases/new`. Fill case form (same category as the test template, mainTopic, etc.). Submit. Extract caseId from redirect URL. Navigate back to template edit page. Publish v2 (AC4). Then use `callMutation(page, "cases:get", { caseId })` or equivalent query to read the case's `templateVersionId`. Compare against v1's ID (obtained from version history or `callMutation`). Assert they match. |
| Archives the template; verifies it's hidden from the category picker | e2e | On `/admin/templates/:id`, click "Archive" button. Confirm in dialog. Assert template status shows "Archived" and form fields are disabled. Navigate to `/admin/templates` list. Assert the template row shows "Archived" status. For picker verification: navigate to `/cases/new` and verify that case creation with the same category either (a) succeeds by picking a different active template (seed template) or (b) the category is absent from the picker if no other active template exists for it. |
| Verifies the pinned case still functions correctly with the archived template | e2e | Navigate to the case created in AC5 (e.g., `/cases/:caseId/private`). Assert the private coaching page loads without errors. Send a message in the chat input. Wait for the mock AI response to stream and complete (streaming indicator disappears, response text visible). Assert the response is non-empty. This proves template version resolution works for archived templates. |

## Open questions

**Q1: Category picker shows categories, not template names.** The NewCaseForm renders 5 category radio buttons (workplace, family, personal, contractual, other). It does not show template names. Archiving a template for a category that also has a seed template does not remove the category from the picker — the seed template remains active. The test can only verify category *absence* if the test's template is the ONLY active template for its category. Given seed data populates all 5 categories, the archive-hides-from-picker AC may need to be verified indirectly: assert the template shows as Archived in the admin list, and assert that case creation for that category now resolves to the seed template (different templateVersionId). The contract resolves this by verifying archive status in the admin UI (primary) and optionally verifying picker behavior if the seed data for the chosen category can be archived first via `callMutation`.

**Q2: Obtaining v1's templateVersionId for pin comparison.** The version history UI shows version numbers and timestamps but does not expose the raw `_id` of each `templateVersions` row. To compare the case's `templateVersionId` against v1's ID, the test needs to use `callMutation` to call `admin/templates:listVersions` and extract v1's `_id` from the result, or call a query that returns the case's full record including `templateVersionId`. The contract assumes `callMutation(page, "admin/templates:listVersions", { templateId })` returns an array where the last element (oldest) is v1, and its `_id` field is the version ID.

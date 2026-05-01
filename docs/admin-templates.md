# Admin Template Management

The admin template CRUD backend (`convex/templates.ts`) lets administrators
create, version, and archive the AI coaching prompt templates that drive
each conflict category.

## Concepts

- **Template** — a named coaching configuration tied to a conflict category
  (e.g. workplace, family, personal). Each template has a `currentVersionId`
  that points to its latest published version.
- **Template version** — an immutable snapshot of the prompt fields
  (`globalGuidance`, `coachInstructions`, `draftCoachInstructions`). Once
  published, a version row is never modified; updating a template always
  creates a new version row.
- **Archiving** — sets `archivedAt` on a template. Archived templates are
  hidden from the category picker for new cases but remain accessible to
  cases already pinned to them.

## Convex Functions

All functions require the caller to be authenticated with `role === 'ADMIN'`.
Non-admin callers receive a `FORBIDDEN` error.

### Mutations

| Function | Purpose | Key args |
|---|---|---|
| `createTemplate` | Create a new template + initial version (v1) | `category`, `name`, `globalGuidance`, `coachInstructions?`, `draftCoachInstructions?` |
| `publishNewVersion` | Publish a new immutable version for an existing template | `templateId`, `globalGuidance`, `coachInstructions?`, `draftCoachInstructions?`, `notes?` |
| `archiveTemplate` | Soft-archive a template (sets `archivedAt`) | `templateId` |

### Queries

| Function | Purpose | Key args |
|---|---|---|
| `listAllTemplates` | List all templates including archived (admin view) | — |
| `listTemplateVersions` | List all versions for a template, newest first | `templateId` |

## Audit Logging

Every mutation writes an audit log entry with one of the following action
strings:

| Action | Target type |
|---|---|
| `TEMPLATE_CREATED` | `template` |
| `TEMPLATE_PUBLISHED` | `templateVersion` |
| `TEMPLATE_ARCHIVED` | `template` |

## Version Numbering

Version numbers are monotonically increasing integers starting at 1.
`publishNewVersion` determines the next number by finding the current
maximum version for the template and incrementing it.

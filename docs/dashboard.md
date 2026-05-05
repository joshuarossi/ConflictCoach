# Dashboard

The Dashboard (`/dashboard`) is the user's home screen after login. It provides an at-a-glance view of all cases and serves as the primary entry point for creating new ones.

## Layout

The dashboard content area is centered within `<main>` with a max-width of 720 px (reading width). A "+New Case" button is displayed prominently in the header area and routes to `/cases/new`.

## Case grouping

Cases returned by the `cases/list` reactive query are split into two sections:

- **Active** — all cases whose status does not start with `CLOSED_`.
- **Closed** — all cases with a `CLOSED_*` status. This section is collapsed by default and can be expanded by clicking its header.

## Case row content

Each row displays:

| Field | Description |
|---|---|
| Other party name | Display name of the other participant (or "Solo case" for solo entries) |
| Category | The case category |
| Created date | When the case was created |
| Status text | Human-readable status label |
| Last activity | Relative time since the last update |
| Enter button | Links to `/cases/:caseId` |

Clicking anywhere on a case row also navigates to `/cases/:caseId`.

## Status indicators

Color-coded glyphs communicate turn-based state without requiring the user to read status text:

| Glyph | Color | Meaning | Statuses |
|---|---|---|---|
| ● | Green (`text-green-600`) | Your turn | `DRAFT_PRIVATE_COACHING` (when private coaching not yet completed) |
| ○ | Gray (`text-gray-400`) | Waiting on other party | `DRAFT_PRIVATE_COACHING` (when private coaching completed), `BOTH_PRIVATE_COACHING` |
| ◐ | Amber (`text-amber-500`) | Ready for joint session | `READY_FOR_JOINT`, `JOINT_ACTIVE` |
| ◼ | Neutral (`text-gray-500`) | Closed | `CLOSED_RESOLVED`, `CLOSED_UNRESOLVED`, `CLOSED_ABANDONED` |

## Empty state

When the user has no cases, the dashboard displays:

> No cases yet. When you're ready to work through something, start a new case.

The "+New Case" button remains available so the user can begin immediately.

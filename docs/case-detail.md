# Case Detail

The Case Detail page (`/cases/:caseId`) is the central routing hub for all case-specific views. It reads the case record, determines its lifecycle phase, and renders the appropriate sub-view.

## Context header

The page header displays:

- **Title** — "Case with [other party name]" (resolved server-side by the `cases/get` query).
- **Phase badge** — a human-readable label for the current status (e.g. "Private Coaching", "Joint Chat", "Closed — Resolved").

This same context is available to the TopNav component so the user always knows which case and phase they are viewing.

## Status-based routing

| Case status              | Sub-view rendered |
| ------------------------ | ----------------- |
| `DRAFT_PRIVATE_COACHING` | Private Coaching  |
| `BOTH_PRIVATE_COACHING`  | Private Coaching  |
| `READY_FOR_JOINT`        | Ready for Joint   |
| `JOINT_ACTIVE`           | Joint Chat        |
| `CLOSED_RESOLVED`        | Closed Case       |
| `CLOSED_UNRESOLVED`      | Closed Case       |
| `CLOSED_ABANDONED`       | Closed Case       |

## Loading state

While the `cases/get` query is loading (returns `undefined`), a skeleton layout is shown with placeholder shapes matching the eventual page structure.

## Not-found / forbidden

If the case does not exist or the authenticated user is not a party to the case, a 404 view is displayed with a link back to the dashboard.

## Layout

The case detail content area follows the project's max-width constraints: 720 px for reading views and 1080 px for chat views, as defined in the design system.

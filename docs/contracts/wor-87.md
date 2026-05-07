---
task_id: WOR-87
ticket_summary: "TopNav: UserMenu mis-positioned (mid-row, not right-aligned) on case routes for non-solo cases"
ac_refs:
  - "On /cases/:caseId (any phase), for a non-solo case where TopNav is rendered with no children prop, the UserMenu dropdown trigger sits flush against the right edge of the nav bar (allowing for px-4 padding), with empty horizontal space between it and the case-label group on the left."
  - "On /cases/:caseId/private (or any case route) for a solo case (caseContext.isSolo === true), PartyToggle and UserMenu both appear in the right-hand group, with PartyToggle to the left of UserMenu. PartyToggle is no longer pushed by an ml-auto wrapper — its right-alignment comes from being inside the right group of a justify-between row."
  - "On /cases/:caseId (any phase) when TopNav is rendered with a non-null children prop and the case is non-solo, children appear in the right-hand group to the left of UserMenu. UserMenu remains the right-most element."
  - "On /dashboard and other non-case routes, TopNav rendering is byte-identical to before this change — the dashboard branch is not modified."
  - "Existing unit tests in tests/wor-84/topnav-party-toggle.test.tsx continue to pass without modification."
  - "A new unit test asserts that, on a non-solo case route with no children, UserMenu is the last DOM child of the nav row container and the case-label group is the first DOM child."
files:
  - path: src/components/layout/TopNav.tsx
    role: connected
    action: modify
    exports:
      - "TopNav — connected component (unchanged public API)"
      - "TopNavProps — interface { children?: ReactNode } (unchanged)"
  - path: tests/wor-87/topnav-usermenu-position.test.tsx
    role: test-infrastructure
    action: create
    exports:
      - "test suite: WOR-87 TopNav UserMenu right-alignment"
signatures:
  - "export function TopNav({ children }: TopNavProps): JSX.Element"
  - "export interface TopNavProps { children?: ReactNode }"
queries_used:
  - "api.cases.get — called with { caseId } on case routes; returns { otherPartyName?, status?, isSolo? }"
  - "api.users.me — called unconditionally by UserMenu; returns { displayName?, email?, role? }"
invariants:
  - "TopNavProps interface is unchanged — no new props added."
  - "The dashboard/non-case branch (lines 253-280) is not modified at all."
  - "UserMenu is always the rightmost element in the case-route nav row."
  - "PartyToggle visibility gating (caseContext?.isSolo === true) is preserved exactly as-is."
  - "No ml-auto wrappers remain in the case-route branch — right-alignment is achieved via justify-between between left and right groups."
  - "aria-label='Case navigation' and focus-visible outlines are preserved."
  - "Tab order remains left-group → right-group (natural reading order)."
  - "No color tokens, spacing scale, font sizes, focus rings, or border styles are changed."
non_goals:
  - "WOR-86 PrivacyBanner prop regression — separate ticket."
  - "WOR-84 PartyToggle visibility gating logic — already implemented, not changing logic here."
  - "Mobile responsive behaviour beyond existing flex classes."
  - "No changes to UserMenu, AdminMenu, or PartyToggle component internals."
tested_by:
  - ac: "Non-solo case with no children: UserMenu flush right"
    layer: unit
    file: tests/wor-87/topnav-usermenu-position.test.tsx
  - ac: "Solo case: PartyToggle and UserMenu in right group, PartyToggle left of UserMenu, no ml-auto"
    layer: unit
    file: tests/wor-87/topnav-usermenu-position.test.tsx
  - ac: "Non-solo case with children: children in right group left of UserMenu"
    layer: unit
    file: tests/wor-87/topnav-usermenu-position.test.tsx
  - ac: "Dashboard branch unmodified"
    layer: unit
    file: tests/wor-87/topnav-usermenu-position.test.tsx
  - ac: "Existing WOR-84 tests pass without modification"
    layer: unit
    file: tests/wor-84/topnav-party-toggle.test.tsx
    reason: "Existing tests — just confirm they still pass."
  - ac: "Structural regression test: UserMenu is last child, case-label group is first child"
    layer: unit
    file: tests/wor-87/topnav-usermenu-position.test.tsx
---

# Contract: WOR-87 — TopNav: UserMenu mis-positioned on case routes for non-solo cases

## Why this work exists

On case routes (e.g. `/cases/:caseId/private`) for non-solo cases, the UserMenu dropdown renders mid-row instead of right-aligned because the case-route branch uses a single `flex` container without `justify-between`, and nothing carries `ml-auto` when neither PartyToggle nor children renders. This makes the nav look broken in the most common production scenario (two-party cases). The fix restructures the case-route branch to use a two-group layout matching the dashboard branch.

## Files and exports

### `src/components/layout/TopNav.tsx` (modify)

The case-route branch (currently lines 211–249) will be restructured from a single flex row to a two-group `justify-between` layout:

```
<div className="flex items-center justify-between">
  {/* Left group */}
  <div className="flex items-center gap-3">
    ← Back to Dashboard | Case with X · Phase
  </div>
  {/* Right group */}
  <div className="flex items-center gap-3">
    {PartyToggle when solo}
    {children when non-solo and provided}
    <UserMenu />
  </div>
</div>
```

The `ml-auto` wrappers around PartyToggle and children are removed. The dashboard branch is untouched. The public API (`TopNav` component and `TopNavProps` interface) is unchanged.

### `tests/wor-87/topnav-usermenu-position.test.tsx` (create)

Unit tests verifying the structural layout of the case-route branch. Uses the same mock pattern as `tests/wor-84/topnav-party-toggle.test.tsx` (mocking `convex/react`, `@convex-dev/auth/react`, and the API module). Tests assert DOM structure (child ordering within the nav container) rather than visual position.

## Data dependencies

- **`api.cases.get`** — called with `{ caseId }` when on a case route. Returns `{ otherPartyName?: string, status?: string, isSolo?: boolean }`. This work reads `otherPartyName` (for the case label), `status` (for phase fallback), and `isSolo` (for PartyToggle gating). No changes to how these fields are consumed.

- **`api.users.me`** — called by UserMenu unconditionally. Returns `{ displayName?, email?, role? }`. Not changed by this work.

## Invariants

**UserMenu is always rightmost in case nav.** After the fix, `<UserMenu />` is the last element inside the right-group div, which is itself the last child of the `justify-between` container. This structural guarantee prevents the regression regardless of which optional elements (PartyToggle, children) render.

**No ml-auto in case branch.** The two-group `justify-between` pattern makes `ml-auto` unnecessary. Removing these wrappers eliminates the root cause: when no element carries `ml-auto`, the old layout collapsed everything leftward.

**Dashboard branch byte-identical.** The `if (isCaseRoute)` branch is the only code path modified. The else branch starting at line 253 is not touched.

**PartyToggle gating preserved.** The condition `caseContext?.isSolo === true` remains exactly as-is. Only the wrapper changes (from `<div className="ml-auto">` to being a direct child of the right group).

**Accessibility preserved.** The `<nav aria-label="Case navigation">` wrapper, focus-visible outlines on interactive elements, and natural tab order (left elements before right elements in DOM) are all maintained.

## Edge cases

**Loading state (caseContext undefined).** When `caseContext` is still loading, neither PartyToggle nor children renders in the right group — only UserMenu. UserMenu is still right-aligned because it's inside the right group of a `justify-between` row. This is the key improvement: the old layout broke specifically in this scenario.

**Null children prop.** When `children` is not provided (the default), the right group contains only the conditionally-rendered PartyToggle (if solo) and UserMenu. The layout remains correct because `justify-between` doesn't depend on the right group having multiple children.

**Both PartyToggle and children.** Per current logic, PartyToggle renders only when `isSolo === true`, and children renders only when `!caseContext?.isSolo`. These are mutually exclusive, so both never appear simultaneously. The contract preserves this existing logic.

## Non-goals

- **WOR-86 PrivacyBanner** — that ticket's prop regression is a separate concern.
- **WOR-84 PartyToggle visibility** — already implemented; this ticket only changes spatial positioning, not conditional rendering logic.
- **Mobile responsive** — no new responsive breakpoints. Existing flex behavior handles narrow viewports as-is.
- **Component internals** — UserMenu, AdminMenu, and PartyToggle are not modified.

## Test coverage

| AC | Test file | Layer | Notes |
|----|-----------|-------|-------|
| Non-solo, no children → UserMenu right-aligned | `tests/wor-87/topnav-usermenu-position.test.tsx` | unit | Assert UserMenu is last child of nav container's last child div |
| Solo → PartyToggle + UserMenu in right group | `tests/wor-87/topnav-usermenu-position.test.tsx` | unit | Assert both are in same parent div, PartyToggle before UserMenu |
| Non-solo with children → children + UserMenu in right group | `tests/wor-87/topnav-usermenu-position.test.tsx` | unit | Assert children appear before UserMenu in right group |
| Dashboard unchanged | `tests/wor-87/topnav-usermenu-position.test.tsx` | unit | Snapshot or structure assertion on dashboard render |
| WOR-84 tests still pass | `tests/wor-84/topnav-party-toggle.test.tsx` | unit | No modification needed — existing tests exercise gating logic |
| Structural regression: UserMenu last, case-label first | `tests/wor-87/topnav-usermenu-position.test.tsx` | unit | DOM child-order assertions on the justify-between container |

All ACs are testable at the unit layer because the bug is purely structural (DOM ordering / className presence), and the existing mock pattern from WOR-84 provides the necessary data layer isolation.

/**
 * WOR-62 AC2: Table is filterable by actor and action type.
 *
 * Tests verify that select dropdowns for actor and action type exist and
 * that selecting a filter value causes only matching rows to be displayed.
 *
 * These tests will FAIL until AuditLogPage implements client-side filtering
 * with select dropdowns for actor and action type.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mock data — mixed actors and action types for filter testing
// ---------------------------------------------------------------------------

const MOCK_AUDIT_ENTRIES = [
  {
    _id: "auditLog_1",
    actorUserId: "users_admin1",
    actorDisplayName: "Riley Admin",
    action: "TEMPLATE_CREATED",
    targetType: "template",
    targetId: "templates_1",
    metadata: { category: "workplace" },
    createdAt: 1714400520000,
  },
  {
    _id: "auditLog_2",
    actorUserId: "users_admin2",
    actorDisplayName: "Sam Ops",
    action: "TEMPLATE_PUBLISHED",
    targetType: "templateVersion",
    targetId: "templateVersions_1",
    metadata: { version: 1 },
    createdAt: 1714486920000,
  },
  {
    _id: "auditLog_3",
    actorUserId: "users_admin1",
    actorDisplayName: "Riley Admin",
    action: "TEMPLATE_ARCHIVED",
    targetType: "template",
    targetId: "templates_2",
    metadata: {},
    createdAt: 1714573320000,
  },
  {
    _id: "auditLog_4",
    actorUserId: "users_admin2",
    actorDisplayName: "Sam Ops",
    action: "TEMPLATE_CREATED",
    targetType: "template",
    targetId: "templates_3",
    metadata: { category: "family" },
    createdAt: 1714659720000,
  },
];

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: (queryRef: unknown) => {
    const name = String(queryRef ?? "");
    if (name.includes("audit")) {
      return MOCK_AUDIT_ENTRIES;
    }
    return { role: "ADMIN", displayName: "Riley Admin" };
  },
  useMutation: () => vi.fn(),
}));

import { AuditLogPage } from "@/pages/admin/AuditLogPage";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AC2: Table is filterable by actor and action type", () => {
  const user = userEvent.setup();

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/admin/audit"]}>
        <AuditLogPage />
      </MemoryRouter>,
    );
  }

  function getDataRowCount(): number {
    const table = screen.getByRole("table");
    const allRows = within(table).getAllByRole("row");
    // Subtract header row
    return allRows.length - 1;
  }

  test("renders an actor filter control", () => {
    renderPage();

    // Look for a select/combobox labeled for actor filtering
    const actorFilter =
      screen.queryByLabelText(/actor/i) ||
      screen.queryByRole("combobox", { name: /actor/i });
    expect(actorFilter).toBeInTheDocument();
  });

  test("renders an action type filter control", () => {
    renderPage();

    const actionFilter =
      screen.queryByLabelText(/action/i) ||
      screen.queryByRole("combobox", { name: /action/i });
    expect(actionFilter).toBeInTheDocument();
  });

  test("filtering by actor shows only that actor's entries", async () => {
    renderPage();

    // Initially all 4 rows
    expect(getDataRowCount()).toBe(4);

    // Select actor filter for "Sam Ops" (users_admin2)
    const actorFilter =
      screen.getByLabelText(/actor/i) ||
      screen.getByRole("combobox", { name: /actor/i });
    await user.selectOptions(actorFilter, "Sam Ops");

    // Should show only Sam Ops entries (2 of 4)
    expect(getDataRowCount()).toBe(2);

    const table = screen.getByRole("table");
    const cells = within(table).getAllByRole("cell");
    const cellTexts = cells.map((c) => c.textContent);

    // All visible rows should mention Sam Ops
    expect(cellTexts.some((t) => t?.includes("Sam Ops"))).toBe(true);
    expect(cellTexts.some((t) => t?.includes("Riley Admin"))).toBe(false);
  });

  test("filtering by action type shows only matching entries", async () => {
    renderPage();

    expect(getDataRowCount()).toBe(4);

    const actionFilter =
      screen.getByLabelText(/action/i) ||
      screen.getByRole("combobox", { name: /action/i });
    await user.selectOptions(actionFilter, "TEMPLATE_CREATED");

    // TEMPLATE_CREATED appears in entries 1 and 4
    expect(getDataRowCount()).toBe(2);
  });

  test("both filters can be applied simultaneously", async () => {
    renderPage();

    const actorFilter =
      screen.getByLabelText(/actor/i) ||
      screen.getByRole("combobox", { name: /actor/i });
    const actionFilter =
      screen.getByLabelText(/action/i) ||
      screen.getByRole("combobox", { name: /action/i });

    await user.selectOptions(actorFilter, "Sam Ops");
    await user.selectOptions(actionFilter, "TEMPLATE_CREATED");

    // Only Sam Ops + TEMPLATE_CREATED = 1 entry
    expect(getDataRowCount()).toBe(1);
  });
});

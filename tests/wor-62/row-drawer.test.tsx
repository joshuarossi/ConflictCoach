/**
 * WOR-62 AC3: Clicking a row opens a side drawer displaying the full JSON
 * metadata payload for that audit entry.
 *
 * These tests will FAIL until AuditLogPage implements the side drawer
 * interaction on row click.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mock data with distinct metadata per entry
// ---------------------------------------------------------------------------

const ENTRY_WITH_METADATA = {
  _id: "auditLog_1",
  actorUserId: "users_admin1",
  actorDisplayName: "Riley Admin",
  action: "TEMPLATE_CREATED",
  targetType: "template",
  targetId: "templates_1",
  metadata: { category: "workplace", name: "Workplace Default" },
  createdAt: 1714400520000,
};

const ENTRY_MINIMAL_METADATA = {
  _id: "auditLog_2",
  actorUserId: "users_admin2",
  actorDisplayName: "Sam Ops",
  action: "TEMPLATE_PUBLISHED",
  targetType: "templateVersion",
  targetId: "templateVersions_1",
  metadata: { version: 1 },
  createdAt: 1714486920000,
};

const MOCK_AUDIT_ENTRIES = [ENTRY_WITH_METADATA, ENTRY_MINIMAL_METADATA];

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

describe("AC3: Clicking a row opens a side drawer with JSON metadata", () => {
  const user = userEvent.setup();

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/admin/audit"]}>
        <AuditLogPage />
      </MemoryRouter>,
    );
  }

  test("no drawer is visible before clicking a row", () => {
    renderPage();

    // Drawer should not be in the DOM initially
    const drawer =
      screen.queryByRole("dialog") ||
      screen.queryByTestId("audit-detail-drawer");
    expect(drawer).not.toBeInTheDocument();
  });

  test("clicking a table row opens a drawer", async () => {
    renderPage();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // Click first data row (index 1, since index 0 is header)
    await user.click(rows[1]);

    const drawer =
      screen.queryByRole("dialog") ||
      screen.queryByTestId("audit-detail-drawer");
    expect(drawer).toBeInTheDocument();
  });

  test("drawer displays the full JSON metadata payload", async () => {
    renderPage();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    await user.click(rows[1]);

    // The metadata should appear in JSON format in the drawer — scope to drawer
    // ENTRY_WITH_METADATA.metadata = { category: "workplace", name: "Workplace Default" }
    const drawer =
      screen.getByRole("dialog") ||
      screen.getByTestId("audit-detail-drawer");
    expect(within(drawer).getByText(/workplace/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/Workplace Default/)).toBeInTheDocument();
  });

  test("clicking a different row updates the drawer to that entry's metadata", async () => {
    renderPage();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");

    // Click first data row
    await user.click(rows[1]);
    expect(screen.getByText(/Workplace Default/)).toBeInTheDocument();

    // Click second data row
    await user.click(rows[2]);

    // Drawer should now show the second entry's metadata (version: 1)
    // and the first entry's unique metadata should no longer be prominent
    const drawer =
      screen.getByRole("dialog") ||
      screen.getByTestId("audit-detail-drawer");
    const drawerContent = drawer.textContent || "";
    expect(drawerContent).toContain("version");
  });
});

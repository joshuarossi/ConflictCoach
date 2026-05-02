/**
 * WOR-62 AC1: Audit log page renders a table with columns:
 * Actor (display name), Action, Target, Timestamp — and data rows.
 *
 * These tests will FAIL until AuditLogPage is fully implemented with
 * table rendering backed by the admin/audit/list Convex query.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mock Convex hooks to supply audit log data
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
    createdAt: 1714400520000, // Apr 29, 2024
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
];

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

// Track call index to differentiate multiple useQuery calls in the component.
// The component is expected to call useQuery for the current user (role check)
// and for the audit log entries. We return audit entries when the query arg
// looks like the audit list query, and an admin user profile otherwise.
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

describe("AC1: Audit log table renders with correct columns", () => {
  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/admin/audit"]}>
        <AuditLogPage />
      </MemoryRouter>,
    );
  }

  test("renders table headers: Actor, Action, Target, Timestamp", () => {
    renderPage();

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    const headers = within(table).getAllByRole("columnheader");
    const headerTexts = headers.map((h) => h.textContent?.toLowerCase());

    expect(headerTexts).toEqual(
      expect.arrayContaining([
        expect.stringContaining("actor"),
        expect.stringContaining("action"),
        expect.stringContaining("target"),
        expect.stringContaining("timestamp"),
      ]),
    );
  });

  test("renders one data row per audit entry", () => {
    renderPage();

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");

    // Rows include 1 header row + 3 data rows
    expect(rows.length).toBe(1 + MOCK_AUDIT_ENTRIES.length);
  });

  test("displays actor display names in data rows", () => {
    renderPage();

    expect(screen.getByText("Riley Admin")).toBeInTheDocument();
    expect(screen.getByText("Sam Ops")).toBeInTheDocument();
  });

  test("displays action types in data rows", () => {
    renderPage();

    expect(screen.getByText(/TEMPLATE_CREATED/)).toBeInTheDocument();
    expect(screen.getByText(/TEMPLATE_PUBLISHED/)).toBeInTheDocument();
    expect(screen.getByText(/TEMPLATE_ARCHIVED/)).toBeInTheDocument();
  });
});

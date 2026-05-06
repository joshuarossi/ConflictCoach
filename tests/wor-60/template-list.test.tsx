/**
 * WOR-60: Template list page tests
 *
 * AC1: Template list page shows table — Category, Name, Current Version,
 *      Status (Active/Archived), Pinned Cases Count
 * AC2: '+ New Template' button opens create form
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mocks — control per-test via mutable refs
// ---------------------------------------------------------------------------

const queryResults = vi.hoisted(() => ({
  me: { role: "ADMIN", displayName: "Riley Admin" } as Record<string, unknown> | undefined,
  templates: [] as Record<string, unknown>[],
}));

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
}));

vi.mock("convex/react", () => ({
  useQuery: (_fn: unknown) => {
    // Rough dispatch: the first call is for users.me (AdminGuard),
    // subsequent ones for template list data.
    const fnStr = String(_fn);
    if (fnStr.includes("me") || fnStr.includes("user")) return queryResults.me;
    return queryResults.templates;
  },
  useMutation: () => vi.fn(),
}));

import { TemplatesListPage } from "@/pages/admin/TemplatesListPage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderList() {
  return render(
    <MemoryRouter initialEntries={["/admin/templates"]}>
      <TemplatesListPage />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES = [
  {
    _id: "templates:t1",
    category: "workplace",
    name: "Workplace Default",
    currentVersionId: "templateVersions:v3",
    archivedAt: undefined,
    createdAt: 1_700_000_000_000,
    createdByUserId: "users:u1",
    currentVersion: 3,
    pinnedCasesCount: 5,
  },
  {
    _id: "templates:t2",
    category: "family",
    name: "Family Conflict",
    currentVersionId: "templateVersions:v1",
    archivedAt: 1_700_100_000_000,
    createdAt: 1_699_000_000_000,
    createdByUserId: "users:u1",
    currentVersion: 1,
    pinnedCasesCount: 0,
  },
  {
    _id: "templates:t3",
    category: "personal",
    name: "Personal Growth",
    currentVersionId: "templateVersions:v2",
    archivedAt: undefined,
    createdAt: 1_699_500_000_000,
    createdByUserId: "users:u1",
    currentVersion: 2,
    pinnedCasesCount: 12,
  },
];

// ---------------------------------------------------------------------------
// AC1: Template list page shows table with correct columns
// ---------------------------------------------------------------------------

describe("AC1: Template list table", () => {
  beforeEach(() => {
    queryResults.me = { role: "ADMIN", displayName: "Riley Admin" };
    queryResults.templates = MOCK_TEMPLATES;
  });

  test("renders column headers: Category, Name, Current Version, Status, Pinned Cases Count", () => {
    renderList();

    const expectedHeaders = [
      /category/i,
      /name/i,
      /version/i,
      /status/i,
      /pinned\s*cases/i,
    ];

    for (const header of expectedHeaders) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
  });

  test("renders a row for each template with correct data", () => {
    renderList();

    // Active template
    expect(screen.getByText("Workplace Default")).toBeInTheDocument();
    expect(screen.getByText("workplace")).toBeInTheDocument();

    // Archived template
    expect(screen.getByText("Family Conflict")).toBeInTheDocument();
  });

  test("shows Active status for non-archived templates and Archived for archived ones", () => {
    renderList();

    const activeIndicators = screen.getAllByText(/active/i);
    const archivedIndicators = screen.getAllByText(/archived/i);

    // 2 active, 1 archived in our fixtures
    expect(activeIndicators.length).toBeGreaterThanOrEqual(2);
    expect(archivedIndicators.length).toBeGreaterThanOrEqual(1);
  });

  test("displays pinned cases count for each template", () => {
    renderList();

    // Pinned counts from fixtures: 5, 0, 12
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  test("renders as a table element", () => {
    renderList();

    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC2: '+ New Template' button opens create form
// ---------------------------------------------------------------------------

describe("AC2: '+ New Template' button", () => {
  beforeEach(() => {
    queryResults.me = { role: "ADMIN", displayName: "Riley Admin" };
    queryResults.templates = [];
  });

  test("renders a '+ New Template' button", () => {
    renderList();

    const btn = screen.getByRole("button", { name: /new template/i });
    expect(btn).toBeInTheDocument();
  });

  test("clicking '+ New Template' shows the create form", async () => {
    const user = userEvent.setup();
    renderList();

    const btn = screen.getByRole("button", { name: /new template/i });
    await user.click(btn);

    // After clicking, a create form should be visible (either inline or via navigation).
    // We look for form fields that indicate the create form rendered.
    const nameInput =
      screen.queryByRole("textbox", { name: /name/i }) ??
      screen.queryByLabelText(/name/i);
    expect(nameInput).toBeInTheDocument();
  });

  test("shows empty state message when no templates exist", () => {
    queryResults.templates = [];
    renderList();

    expect(
      screen.getByText(/no templates yet/i),
    ).toBeInTheDocument();
  });
});

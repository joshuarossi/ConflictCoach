/**
 * WOR-60: Archive template with danger confirmation modal
 *
 * AC6: 'Archive Template' button with danger confirmation modal;
 *      shows pinned case count warning
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const queryResults = vi.hoisted(() => ({
  me: { role: "ADMIN", displayName: "Riley Admin" } as
    | Record<string, unknown>
    | undefined,
  template: null as Record<string, unknown> | null,
  versions: [] as Record<string, unknown>[],
}));

const mockArchive = vi.fn();
const mockNoOp = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
}));

vi.mock("convex/react", () => ({
  useQuery: (_fn: unknown) => {
    const fnStr = String(_fn);
    if (fnStr.includes("me") || fnStr.includes("user")) return queryResults.me;
    if (fnStr.includes("Version") || fnStr.includes("version"))
      return queryResults.versions;
    return queryResults.template;
  },
  useMutation: (_fn: unknown) => {
    const fnStr = String(_fn);
    if (fnStr.includes("archive")) return mockArchive;
    return mockNoOp;
  },
}));

import { TemplateEditPage } from "@/pages/admin/TemplateEditPage";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_TEMPLATE = {
  _id: "templates:t1",
  category: "workplace",
  name: "Workplace Default",
  currentVersionId: "templateVersions:v1",
  archivedAt: undefined,
  createdAt: 1_700_000_000_000,
  createdByUserId: "users:u1",
  pinnedCasesCount: 7,
};

const MOCK_VERSIONS = [
  {
    _id: "templateVersions:v1",
    templateId: "templates:t1",
    version: 1,
    globalGuidance: "Original guidance.",
    publishedAt: 1_700_000_000_000,
    publishedByUserId: "users:u1",
    notes: "Initial version.",
    _publishedByName: "Riley Admin",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={["/admin/templates/t1"]}>
      <Routes>
        <Route path="/admin/templates/:id" element={<TemplateEditPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AC6: Archive Template with danger confirmation", () => {
  beforeEach(() => {
    queryResults.me = { role: "ADMIN", displayName: "Riley Admin" };
    queryResults.template = MOCK_TEMPLATE;
    queryResults.versions = MOCK_VERSIONS;
    mockArchive.mockClear();
  });

  test("renders an 'Archive Template' button", () => {
    renderEdit();

    const btn = screen.getByRole("button", { name: /archive/i });
    expect(btn).toBeInTheDocument();
  });

  test("'Archive Template' button has danger styling", () => {
    renderEdit();

    const btn = screen.getByRole("button", { name: /archive/i });
    const classes = btn.className;
    // Should use destructive/danger variant — not default/primary
    expect(classes).toMatch(/destructive|danger|red/i);
  });

  test("clicking 'Archive' opens a confirmation dialog", async () => {
    const user = userEvent.setup();
    renderEdit();

    const btn = screen.getByRole("button", { name: /archive/i });
    await user.click(btn);

    // A dialog/modal should appear
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  test("confirmation dialog shows pinned case count as a warning", async () => {
    const user = userEvent.setup();
    renderEdit();

    const btn = screen.getByRole("button", { name: /archive/i });
    await user.click(btn);

    const dialog = screen.getByRole("dialog");
    // Should warn about the 7 pinned cases
    expect(dialog).toHaveTextContent(/7/);
    expect(dialog).toHaveTextContent(/pinned|case/i);
  });

  test("confirming archive in the dialog calls the archive mutation", async () => {
    const user = userEvent.setup();
    renderEdit();

    // Open the confirmation dialog
    const archiveBtn = screen.getByRole("button", { name: /archive/i });
    await user.click(archiveBtn);

    // Find and click the confirm button inside the dialog
    const dialog = screen.getByRole("dialog");
    const confirmBtn = screen.getByRole("button", {
      name: /confirm|yes|archive/i,
    });
    expect(dialog).toContainElement(confirmBtn);
    await user.click(confirmBtn);

    expect(mockArchive).toHaveBeenCalled();
  });

  test("cancelling the dialog does not call archive mutation", async () => {
    const user = userEvent.setup();
    renderEdit();

    const archiveBtn = screen.getByRole("button", { name: /archive/i });
    await user.click(archiveBtn);

    // Find and click cancel — use exact match because the shadcn Dialog
    // also renders a "Close" button (the corner X), so /cancel|no|close/i
    // matches multiple elements.
    const cancelBtn = screen.getByRole("button", { name: /^cancel$/i });
    await user.click(cancelBtn);

    expect(mockArchive).not.toHaveBeenCalled();
  });
});

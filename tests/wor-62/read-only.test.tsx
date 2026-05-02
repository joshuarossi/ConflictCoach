/**
 * WOR-62 AC4: The view is purely read-only — no edit or delete capabilities.
 *
 * Asserts that the rendered AuditLogPage contains no edit, delete, or form
 * mutation controls.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mock data
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

describe("AC4: Audit log page is purely read-only", () => {
  function renderPage() {
    return render(
      <MemoryRouter initialEntries={["/admin/audit"]}>
        <AuditLogPage />
      </MemoryRouter>,
    );
  }

  test("no edit buttons are present", () => {
    renderPage();

    const editButtons = screen.queryAllByRole("button", { name: /edit/i });
    expect(editButtons).toHaveLength(0);
  });

  test("no delete buttons are present", () => {
    renderPage();

    const deleteButtons = screen.queryAllByRole("button", {
      name: /delete|remove/i,
    });
    expect(deleteButtons).toHaveLength(0);
  });

  test("no text input fields for editing data are present", () => {
    renderPage();

    // Filter selects are acceptable; text inputs for mutation are not.
    // Query all textbox roles — there should be none.
    const textInputs = screen.queryAllByRole("textbox");
    expect(textInputs).toHaveLength(0);
  });

  test("no form elements with submit actions are present", () => {
    // There should be no <form> elements on the page
    const { container } = renderPage();
    const forms = container.querySelectorAll("form");
    expect(forms).toHaveLength(0);
  });
});

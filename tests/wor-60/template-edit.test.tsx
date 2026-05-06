/**
 * WOR-60: Template edit page tests
 *
 * AC3: Edit page has two-pane layout — left = edit form, right = version history timeline
 * AC4: Form fields — Category (select), Name (text), Global Guidance (textarea),
 *      Coach Instructions (textarea), Draft Coach Instructions (textarea), Notes (textarea)
 * AC5: 'Publish New Version' button creates immutable version (primary action)
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

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
}));

const mockPublishVersion = vi.fn();
const mockNoOp = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (_fn: unknown) => {
    const fnStr = String(_fn);
    if (fnStr.includes("me") || fnStr.includes("user")) return queryResults.me;
    if (fnStr.includes("Version") || fnStr.includes("version"))
      return queryResults.versions;
    if (fnStr.includes("template") || fnStr.includes("Template"))
      return queryResults.template;
    return queryResults.me;
  },
  useMutation: (_fn: unknown) => {
    const fnStr = String(_fn);
    if (fnStr.includes("publish") || fnStr.includes("publishNewVersion"))
      return mockPublishVersion;
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
  currentVersionId: "templateVersions:v2",
  archivedAt: undefined,
  createdAt: 1_700_000_000_000,
  createdByUserId: "users:u1",
};

const MOCK_VERSIONS = [
  {
    _id: "templateVersions:v2",
    templateId: "templates:t1",
    version: 2,
    globalGuidance: "Be empathetic and constructive.",
    coachInstructions: "Guide the conversation toward resolution.",
    draftCoachInstructions: "Help the user craft a diplomatic message.",
    publishedAt: 1_700_100_000_000,
    publishedByUserId: "users:u1",
    notes: "Updated guidance for empathy.",
    _publishedByName: "Riley Admin",
  },
  {
    _id: "templateVersions:v1",
    templateId: "templates:t1",
    version: 1,
    globalGuidance: "Original guidance.",
    coachInstructions: "Original coach instructions.",
    draftCoachInstructions: undefined,
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
// AC3: Two-pane layout
// ---------------------------------------------------------------------------

describe("AC3: Edit page two-pane layout", () => {
  beforeEach(() => {
    queryResults.me = { role: "ADMIN", displayName: "Riley Admin" };
    queryResults.template = MOCK_TEMPLATE;
    queryResults.versions = MOCK_VERSIONS;
  });

  test("renders a left pane with the edit form", () => {
    renderEdit();

    // The edit form should be present with at least one form field
    const nameInput =
      screen.queryByRole("textbox", { name: /name/i }) ??
      screen.queryByLabelText(/name/i);
    expect(nameInput).toBeInTheDocument();
  });

  test("renders a right pane with version history", () => {
    renderEdit();

    // Version history should show version entries
    expect(screen.getByText(/version\s*2/i)).toBeInTheDocument();
    expect(screen.getByText(/version\s*1/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC4: Form fields
// ---------------------------------------------------------------------------

describe("AC4: Form fields", () => {
  beforeEach(() => {
    queryResults.me = { role: "ADMIN", displayName: "Riley Admin" };
    queryResults.template = MOCK_TEMPLATE;
    queryResults.versions = MOCK_VERSIONS;
  });

  test("renders Category select field", () => {
    renderEdit();

    // Category can be a <select> role or a custom Select trigger with combobox role
    const categoryField =
      screen.queryByRole("combobox", { name: /category/i }) ??
      screen.queryByLabelText(/category/i);
    expect(categoryField).toBeInTheDocument();
  });

  test("renders Name text input", () => {
    renderEdit();

    const nameInput =
      screen.queryByRole("textbox", { name: /^name$/i }) ??
      screen.queryByLabelText(/^name$/i);
    expect(nameInput).toBeInTheDocument();
  });

  test("renders Global Guidance textarea", () => {
    renderEdit();

    const field =
      screen.queryByRole("textbox", { name: /global guidance/i }) ??
      screen.queryByLabelText(/global guidance/i);
    expect(field).toBeInTheDocument();
  });

  test("renders Coach Instructions textarea", () => {
    renderEdit();

    // Anchored regex — there's also a separate "Draft Coach Instructions"
    // textarea, so /coach instructions/i alone matches both. Use ^ + word
    // boundary to scope to the joint-chat coach instructions field.
    const field =
      screen.queryByRole("textbox", { name: /^coach instructions$/i }) ??
      screen.queryByLabelText(/^coach instructions$/i);
    expect(field).toBeInTheDocument();
  });

  test("renders Draft Coach Instructions textarea", () => {
    renderEdit();

    const field =
      screen.queryByRole("textbox", { name: /draft coach instructions/i }) ??
      screen.queryByLabelText(/draft coach instructions/i);
    expect(field).toBeInTheDocument();
  });

  test("renders Notes textarea", () => {
    renderEdit();

    const field =
      screen.queryByRole("textbox", { name: /notes/i }) ??
      screen.queryByLabelText(/notes/i);
    expect(field).toBeInTheDocument();
  });

  test("form fields are populated with current version data", () => {
    renderEdit();

    // Global Guidance should show the latest version's value
    const guidanceField =
      screen.queryByRole("textbox", { name: /global guidance/i }) ??
      screen.queryByLabelText(/global guidance/i);
    expect(guidanceField).toHaveValue("Be empathetic and constructive.");
  });
});

// ---------------------------------------------------------------------------
// AC5: 'Publish New Version' button (primary action)
// ---------------------------------------------------------------------------

describe("AC5: 'Publish New Version' button", () => {
  beforeEach(() => {
    queryResults.me = { role: "ADMIN", displayName: "Riley Admin" };
    queryResults.template = MOCK_TEMPLATE;
    queryResults.versions = MOCK_VERSIONS;
    mockPublishVersion.mockClear();
  });

  test("renders a 'Publish New Version' button", () => {
    renderEdit();

    const btn = screen.getByRole("button", { name: /publish new version/i });
    expect(btn).toBeInTheDocument();
  });

  test("'Publish New Version' button is styled as the primary action", () => {
    renderEdit();

    const btn = screen.getByRole("button", { name: /publish new version/i });
    // Primary buttons should NOT have danger/destructive styling
    const classes = btn.className;
    expect(classes).not.toMatch(/destructive|danger/i);
  });

  test("clicking 'Publish New Version' calls the publish mutation", async () => {
    const user = userEvent.setup();
    renderEdit();

    const btn = screen.getByRole("button", { name: /publish new version/i });
    await user.click(btn);

    expect(mockPublishVersion).toHaveBeenCalled();
  });
});

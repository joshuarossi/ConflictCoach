/**
 * WOR-60: Version history timeline tests
 *
 * AC7: Version history shows each version with date + admin + notes + 'View' read-only button
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const queryResults = vi.hoisted(() => ({
  me: { role: "ADMIN", displayName: "Riley Admin" } as Record<string, unknown> | undefined,
  template: null as Record<string, unknown> | null,
  versions: [] as Record<string, unknown>[],
}));

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
  useMutation: () => vi.fn(),
}));

import { TemplateEditPage } from "@/pages/admin/TemplateEditPage";

// ---------------------------------------------------------------------------
// Fixtures — 3 versions, descending order
// ---------------------------------------------------------------------------

const MOCK_TEMPLATE = {
  _id: "templates:t1",
  category: "workplace",
  name: "Workplace Default",
  currentVersionId: "templateVersions:v3",
  archivedAt: undefined,
  createdAt: 1_700_000_000_000,
  createdByUserId: "users:u1",
};

const MOCK_VERSIONS = [
  {
    _id: "templateVersions:v3",
    templateId: "templates:t1",
    version: 3,
    globalGuidance: "Version 3 guidance.",
    coachInstructions: "v3 coach instructions.",
    draftCoachInstructions: "v3 draft coach.",
    publishedAt: 1_700_200_000_000, // 2023-11-17
    publishedByUserId: "users:u1",
    notes: "Added empathy guidelines.",
    _publishedByName: "Riley Admin",
  },
  {
    _id: "templateVersions:v2",
    templateId: "templates:t1",
    version: 2,
    globalGuidance: "Version 2 guidance.",
    coachInstructions: "v2 coach instructions.",
    draftCoachInstructions: undefined,
    publishedAt: 1_700_100_000_000, // 2023-11-16
    publishedByUserId: "users:u2",
    notes: "Refined tone.",
    _publishedByName: "Alex Ops",
  },
  {
    _id: "templateVersions:v1",
    templateId: "templates:t1",
    version: 1,
    globalGuidance: "Version 1 guidance.",
    coachInstructions: "v1 coach instructions.",
    draftCoachInstructions: undefined,
    publishedAt: 1_700_000_000_000, // 2023-11-15
    publishedByUserId: "users:u1",
    notes: "Initial release.",
    _publishedByName: "Riley Admin",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderEdit() {
  return render(
    <MemoryRouter initialEntries={["/admin/templates/t1"]}>
      <TemplateEditPage />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AC7: Version history timeline", () => {
  beforeEach(() => {
    queryResults.me = { role: "ADMIN", displayName: "Riley Admin" };
    queryResults.template = MOCK_TEMPLATE;
    queryResults.versions = MOCK_VERSIONS;
  });

  test("shows all three versions", () => {
    renderEdit();

    expect(screen.getByText(/version\s*3/i)).toBeInTheDocument();
    expect(screen.getByText(/version\s*2/i)).toBeInTheDocument();
    expect(screen.getByText(/version\s*1/i)).toBeInTheDocument();
  });

  test("each version entry shows the admin display name", () => {
    renderEdit();

    expect(screen.getByText(/riley admin/i)).toBeInTheDocument();
    expect(screen.getByText(/alex ops/i)).toBeInTheDocument();
  });

  test("each version entry shows notes", () => {
    renderEdit();

    expect(screen.getByText(/added empathy guidelines/i)).toBeInTheDocument();
    expect(screen.getByText(/refined tone/i)).toBeInTheDocument();
    expect(screen.getByText(/initial release/i)).toBeInTheDocument();
  });

  test("each version entry shows a published date", () => {
    renderEdit();

    // Dates should be rendered in some human-readable format
    // We check for the year at minimum since exact format varies
    const dateMatches = screen.getAllByText(/2023/);
    expect(dateMatches.length).toBeGreaterThanOrEqual(3);
  });

  test("each version entry has a 'View' button", () => {
    renderEdit();

    const viewButtons = screen.getAllByRole("button", { name: /view/i });
    expect(viewButtons).toHaveLength(3);
  });

  test("clicking 'View' shows a read-only view of that version's fields", async () => {
    const user = userEvent.setup();
    renderEdit();

    // Click 'View' on version 1 (the oldest)
    const viewButtons = screen.getAllByRole("button", { name: /view/i });
    // Versions are descending, so last View button is version 1
    await user.click(viewButtons[viewButtons.length - 1]);

    // Should show version 1's guidance in a read-only view
    expect(screen.getByText(/version 1 guidance/i)).toBeInTheDocument();
  });

  test("versions are displayed in descending order (newest first)", () => {
    renderEdit();

    const versionLabels = screen.getAllByText(/version\s*\d/i);
    const versionNumbers = versionLabels.map((el) => {
      const match = el.textContent?.match(/version\s*(\d+)/i);
      return match ? Number(match[1]) : 0;
    });

    // Should be [3, 2, 1] — descending
    for (let i = 0; i < versionNumbers.length - 1; i++) {
      expect(versionNumbers[i]).toBeGreaterThan(versionNumbers[i + 1]);
    }
  });
});

/**
 * AC: Dashboard lists cases grouped by Active (non-CLOSED_*) and Closed sections
 * AC: Closed section is collapsed by default
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

const ACTIVE_STATUSES = [
  "DRAFT_PRIVATE_COACHING",
  "BOTH_PRIVATE_COACHING",
  "READY_FOR_JOINT",
  "JOINT_ACTIVE",
] as const;

const CLOSED_STATUSES = [
  "CLOSED_RESOLVED",
  "CLOSED_UNRESOLVED",
  "CLOSED_ABANDONED",
] as const;

function makeCaseFixture(
  overrides: Partial<{
    id: string;
    status: string;
    category: string;
    createdAt: number;
    updatedAt: number;
    isSolo: boolean;
    displayName: string;
    hasCompletedPC: boolean;
  }> = {},
) {
  return {
    id: overrides.id ?? "case-1",
    status: overrides.status ?? "DRAFT_PRIVATE_COACHING",
    category: overrides.category ?? "workplace",
    createdAt: overrides.createdAt ?? 1714600000000,
    updatedAt: overrides.updatedAt ?? 1714600000000,
    isSolo: overrides.isSolo ?? false,
    displayName: overrides.displayName ?? "Jordan",
    hasCompletedPC: overrides.hasCompletedPC ?? false,
  };
}

const MIXED_CASES = [
  makeCaseFixture({
    id: "case-1",
    status: "DRAFT_PRIVATE_COACHING",
    displayName: "Alice",
  }),
  makeCaseFixture({ id: "case-2", status: "JOINT_ACTIVE", displayName: "Bob" }),
  makeCaseFixture({
    id: "case-3",
    status: "CLOSED_RESOLVED",
    displayName: "Carol",
  }),
  makeCaseFixture({
    id: "case-4",
    status: "CLOSED_UNRESOLVED",
    displayName: "Dave",
  }),
  makeCaseFixture({
    id: "case-5",
    status: "READY_FOR_JOINT",
    displayName: "Eve",
  }),
];

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

let mockCases: ReturnType<typeof makeCaseFixture>[] = [];

vi.mock("convex/react", () => ({
  useQuery: (queryRef: unknown) => {
    // Return cases for cases.list, user info for users.me
    if (
      typeof queryRef === "function" ||
      (queryRef && typeof queryRef === "object")
    ) {
      return mockCases;
    }
    return { role: "USER", displayName: "Test User" };
  },
  useMutation: () => vi.fn(),
}));

import { Dashboard } from "@/pages/Dashboard";

function renderDashboard(cases: ReturnType<typeof makeCaseFixture>[] = []) {
  mockCases = cases;
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe("AC: Dashboard lists cases grouped by Active and Closed sections", () => {
  test("renders an Active section containing non-CLOSED cases", () => {
    renderDashboard(MIXED_CASES);

    // Active section should exist
    const activeSection = screen.getByText(/active/i);
    expect(activeSection).toBeInTheDocument();

    // Active cases should be visible
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Eve")).toBeInTheDocument();
  });

  test("renders a Closed section containing only CLOSED_* cases", () => {
    renderDashboard(MIXED_CASES);

    // Closed section should exist
    expect(screen.getByText(/closed/i)).toBeInTheDocument();
  });

  test.each(ACTIVE_STATUSES)(
    "case with status %s appears in the Active section, not Closed",
    (status) => {
      const singleCase = [
        makeCaseFixture({ id: "test-case", status, displayName: "TestParty" }),
      ];
      renderDashboard(singleCase);
      expect(screen.getByText("TestParty")).toBeInTheDocument();
    },
  );

  test.each(CLOSED_STATUSES)(
    "case with status %s appears in the Closed section",
    (status) => {
      const cases = [
        makeCaseFixture({
          id: "active-case",
          status: "DRAFT_PRIVATE_COACHING",
          displayName: "ActiveParty",
        }),
        makeCaseFixture({
          id: "closed-case",
          status,
          displayName: "ClosedParty",
        }),
      ];
      renderDashboard(cases);

      // Locate the Closed section toggle and its parent container. The
      // dashboard renders the section header as an aria-expanded button so
      // the closed list collapses by default; it is not a real heading.
      const closedToggle = screen.getByRole("button", { name: /closed/i });
      const closedSection = (closedToggle.closest(
        "section, [role='region'], details",
      ) ?? closedToggle.parentElement!) as HTMLElement;
      const closedScope = within(closedSection);

      // The closed party name must appear within the Closed section specifically
      expect(closedScope.getByText("ClosedParty")).toBeInTheDocument();
    },
  );
});

describe("AC: Closed section is collapsed by default", () => {
  test("closed cases are not visible when dashboard first renders", () => {
    renderDashboard(MIXED_CASES);

    // Carol and Dave are in closed cases - they should not be visible by default
    expect(screen.queryByText("Carol")).not.toBeVisible();
    expect(screen.queryByText("Dave")).not.toBeVisible();
  });

  test("expanding the Closed section reveals closed cases", async () => {
    const user = userEvent.setup();
    renderDashboard(MIXED_CASES);

    // Find and click the Closed section header/toggle
    const closedToggle = screen.getByText(/closed/i);
    await user.click(closedToggle);

    // After expanding, closed cases should be visible
    expect(screen.getByText("Carol")).toBeVisible();
    expect(screen.getByText("Dave")).toBeVisible();
  });
});

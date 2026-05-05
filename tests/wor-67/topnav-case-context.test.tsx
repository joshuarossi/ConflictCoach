/**
 * WOR-67: TopNav case context header tests
 *
 * Covers:
 * - AC: TopNav shows case context header: "Case with [other party] · [phase name]"
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

let mockQueryResult: unknown = undefined;

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => mockQueryResult,
  useMutation: () => vi.fn(),
}));

import { TopNav } from "@/components/layout/TopNav";

function renderTopNavInCaseRoute(caseId = "case-123") {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
      <Routes>
        <Route path="/cases/:caseId" element={<TopNav />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AC: TopNav shows case context header", () => {
  test("displays 'Case with [otherPartyName]' when case data is loaded", () => {
    mockQueryResult = {
      otherPartyName: "Jordan",
      status: "DRAFT_PRIVATE_COACHING",
    };
    renderTopNavInCaseRoute();
    expect(screen.getByText(/Case with Jordan/)).toBeInTheDocument();
  });

  test("displays phase label 'Private Coaching' for DRAFT_PRIVATE_COACHING", () => {
    mockQueryResult = {
      otherPartyName: "Jordan",
      status: "DRAFT_PRIVATE_COACHING",
    };
    renderTopNavInCaseRoute();
    expect(screen.getByTestId("phase-indicator")).toHaveTextContent(
      "Private Coaching",
    );
  });

  test("displays phase label 'Private Coaching' for BOTH_PRIVATE_COACHING", () => {
    mockQueryResult = {
      otherPartyName: "Jordan",
      status: "BOTH_PRIVATE_COACHING",
    };
    renderTopNavInCaseRoute();
    expect(screen.getByTestId("phase-indicator")).toHaveTextContent(
      "Private Coaching",
    );
  });

  test("displays phase label 'Ready for Joint' for READY_FOR_JOINT", () => {
    mockQueryResult = {
      otherPartyName: "Jordan",
      status: "READY_FOR_JOINT",
    };
    renderTopNavInCaseRoute();
    expect(screen.getByTestId("phase-indicator")).toHaveTextContent(
      "Ready for Joint",
    );
  });

  test("displays phase label 'Joint Chat' for JOINT_ACTIVE", () => {
    mockQueryResult = {
      otherPartyName: "Jordan",
      status: "JOINT_ACTIVE",
    };
    renderTopNavInCaseRoute();
    expect(screen.getByTestId("phase-indicator")).toHaveTextContent(
      "Joint Chat",
    );
  });

  test("displays phase label 'Closed' for CLOSED_RESOLVED", () => {
    mockQueryResult = {
      otherPartyName: "Jordan",
      status: "CLOSED_RESOLVED",
    };
    renderTopNavInCaseRoute();
    expect(screen.getByTestId("phase-indicator")).toHaveTextContent("Closed");
  });

  test("displays phase label 'Closed' for CLOSED_UNRESOLVED", () => {
    mockQueryResult = {
      otherPartyName: "Jordan",
      status: "CLOSED_UNRESOLVED",
    };
    renderTopNavInCaseRoute();
    expect(screen.getByTestId("phase-indicator")).toHaveTextContent("Closed");
  });

  test("displays phase label 'Closed' for CLOSED_ABANDONED", () => {
    mockQueryResult = {
      otherPartyName: "Jordan",
      status: "CLOSED_ABANDONED",
    };
    renderTopNavInCaseRoute();
    expect(screen.getByTestId("phase-indicator")).toHaveTextContent("Closed");
  });

  test("shows fallback when otherPartyName is not available", () => {
    mockQueryResult = {
      otherPartyName: undefined,
      status: "JOINT_ACTIVE",
    };
    renderTopNavInCaseRoute();
    // Should show a fallback like "Case case-123" rather than "Case with undefined"
    const nav = screen.getByRole("navigation");
    expect(nav.textContent).not.toContain("undefined");
  });
});

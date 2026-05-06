/**
 * WOR-54: Closed case view — header metadata
 *
 * AC1: Header shows case name, category, closure date, and outcome
 *      (Resolved / Not Resolved / Abandoned)
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

const mockCase = {
  _id: "cases:test1",
  status: "CLOSED_RESOLVED" as const,
  mainTopic: "Budget disagreement",
  category: "workplace",
  isSolo: false,
  createdAt: 1700000000000,
  updatedAt: 1700100000000,
  closedAt: 1700100000000,
  closureSummary: "Both parties agreed to weekly check-ins.",
  initiatorUserId: "users:u1",
  inviteeUserId: "users:u2",
  schemaVersion: 1 as const,
  templateVersionId: "templateVersions:tv1",
};

let currentMockCase = mockCase;

vi.mock("convex/react", () => ({
  useQuery: (queryRef: unknown) => {
    const name = String(queryRef);
    if (name.includes("cases") || name.includes("get")) return currentMockCase;
    if (name.includes("messages") || name.includes("jointChat")) return [];
    if (name.includes("myMessages") || name.includes("private")) return [];
    if (name.includes("mySynthesis") || name.includes("synthesis")) return null;
    return undefined;
  },
  useMutation: () => vi.fn(),
}));

import { ClosedCaseView } from "@/pages/ClosedCasePage";

function renderView(caseOverrides: Partial<typeof mockCase> = {}) {
  currentMockCase = { ...mockCase, ...caseOverrides };
  return render(
    <MemoryRouter initialEntries={["/cases/test1/closed"]}>
      <Routes>
        <Route path="/cases/:caseId/closed" element={<ClosedCaseView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AC1: Header shows case name, category, closure date, and outcome", () => {
  test("displays case name (mainTopic) in the header", () => {
    renderView();
    expect(screen.getByText(/budget disagreement/i)).toBeInTheDocument();
  });

  test("displays category in the header", () => {
    renderView();
    expect(screen.getByText(/workplace/i)).toBeInTheDocument();
  });

  test("displays closure date", () => {
    renderView({ closedAt: 1700100000000 });
    const headerArea = screen.getByTestId("closed-case-header");
    expect(headerArea).toBeInTheDocument();
    // closedAt 1700100000000 is Nov 15, 2023 — assert a recognizable date fragment
    expect(headerArea.textContent).toMatch(/Nov.*15.*2023|11\/15\/2023|15.*Nov.*2023/);
  });

  test("displays 'Resolved' outcome badge for CLOSED_RESOLVED", () => {
    renderView({ status: "CLOSED_RESOLVED" });
    expect(screen.getByText(/resolved/i)).toBeInTheDocument();
  });

  test("displays 'Not Resolved' outcome badge for CLOSED_UNRESOLVED", () => {
    renderView({ status: "CLOSED_UNRESOLVED" as typeof mockCase.status });
    expect(screen.getByText(/not resolved/i)).toBeInTheDocument();
  });

  test("displays 'Abandoned' outcome badge for CLOSED_ABANDONED", () => {
    renderView({ status: "CLOSED_ABANDONED" as typeof mockCase.status });
    expect(screen.getByText(/abandoned/i)).toBeInTheDocument();
  });
});

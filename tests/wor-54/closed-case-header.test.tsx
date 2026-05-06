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

// The convex anyApi proxy throws on String() coercion. Mock the api module
// so refs become string tokens, then dispatch on those by identity. Use
// vi.hoisted so the mutable ref survives across the hoisted vi.mock factory.
import {
  apiMock,
  makeUseQueryDispatcher,
} from "./__helpers__/closed-case-mocks";

const ref = vi.hoisted(() => ({
  current: {
    caseDoc: undefined as unknown,
    partyData: undefined as unknown,
  },
}));

vi.mock("../../convex/_generated/api", () => apiMock);

vi.mock("convex/react", () => ({
  useQuery: (token: unknown) =>
    makeUseQueryDispatcher({
      caseDoc: ref.current.caseDoc as never,
      partyData: ref.current.partyData as never,
    })(token),
  useMutation: () => vi.fn(),
}));

// Initialize once now that mockCase is defined. ClosedCaseView reads
// caseName from partyData.self.mainTopic, not from caseDoc.mainTopic — see
// src/pages/ClosedCasePage.tsx line 274. So mainTopic has to be threaded
// through partyData here.
function setMocks(caseDoc: typeof mockCase) {
  ref.current.caseDoc = caseDoc;
  ref.current.partyData = {
    self: {
      userId: "users:u1",
      role: "INITIATOR" as const,
      mainTopic: caseDoc.mainTopic,
    },
    other: { userId: "users:u2", role: "INVITEE" as const },
    all: [
      {
        userId: "users:u1",
        role: "INITIATOR" as const,
        mainTopic: caseDoc.mainTopic,
      },
      { userId: "users:u2", role: "INVITEE" as const },
    ],
  };
}
setMocks(mockCase);

import { ClosedCaseView } from "@/pages/ClosedCasePage";

function renderView(caseOverrides: Partial<typeof mockCase> = {}) {
  setMocks({ ...mockCase, ...caseOverrides });
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
    // Use a safe mid-day UTC timestamp so the local-TZ date doesn't drift
    // by a day. 1700136000000 = 2023-11-16T08:00:00Z, which renders as
    // Nov 16 in every timezone west of GMT+8 (i.e. all common test envs).
    renderView({ closedAt: 1700136000000 });
    const headerArea = screen.getByTestId("closed-case-header");
    expect(headerArea).toBeInTheDocument();
    // AC: "closure date" must be displayed. Component uses toLocaleDateString
    // with the long-month format. Assert by year + month name; day-of-month
    // can shift by 1 across timezones for boundary timestamps.
    expect(headerArea.textContent).toMatch(/November.*2023|Nov.*2023|11.*2023/);
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

/**
 * WOR-54: Closed case view — closure summary display
 *
 * AC2: If Resolved, closure summary is prominently displayed.
 *      If not resolved, no summary card shown.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

const baseMockCase = {
  _id: "cases:test1",
  status: "CLOSED_RESOLVED" as const,
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
  current: { caseDoc: undefined as unknown },
}));

vi.mock("../../convex/_generated/api", () => apiMock);

vi.mock("convex/react", () => ({
  useQuery: (token: unknown) =>
    makeUseQueryDispatcher({ caseDoc: ref.current.caseDoc as never })(token),
  useMutation: () => vi.fn(),
}));

import { ClosedCaseView } from "@/pages/ClosedCasePage";

function renderView(caseOverrides: Partial<typeof baseMockCase> = {}) {
  ref.current.caseDoc = { ...baseMockCase, ...caseOverrides };
  return render(
    <MemoryRouter initialEntries={["/cases/test1/closed"]}>
      <Routes>
        <Route path="/cases/:caseId/closed" element={<ClosedCaseView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AC2: Closure summary display", () => {
  test("shows closure summary card when status is CLOSED_RESOLVED", () => {
    renderView({
      status: "CLOSED_RESOLVED",
      closureSummary: "Both parties agreed to weekly check-ins.",
    });
    expect(
      screen.getByText("Both parties agreed to weekly check-ins."),
    ).toBeInTheDocument();
  });

  test("closure summary card is absent when status is CLOSED_UNRESOLVED", () => {
    renderView({
      status: "CLOSED_UNRESOLVED" as typeof baseMockCase.status,
      closureSummary: undefined,
    });
    expect(
      screen.queryByTestId("closure-summary-card"),
    ).not.toBeInTheDocument();
  });

  test("closure summary card is absent when status is CLOSED_ABANDONED", () => {
    renderView({
      status: "CLOSED_ABANDONED" as typeof baseMockCase.status,
      closureSummary: undefined,
    });
    expect(
      screen.queryByTestId("closure-summary-card"),
    ).not.toBeInTheDocument();
  });
});

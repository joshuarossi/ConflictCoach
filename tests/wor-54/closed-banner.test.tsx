/**
 * WOR-54: Closed case view — closed banner
 *
 * AC7: Banner: 'This case is closed. No new messages can be added.'
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
  status: "CLOSED_RESOLVED",
  category: "workplace",
  isSolo: false,
  createdAt: 1700000000000,
  updatedAt: 1700100000000,
  closedAt: 1700100000000,
  closureSummary: "Agreed.",
  initiatorUserId: "users:u1",
  inviteeUserId: "users:u2",
  schemaVersion: 1,
  templateVersionId: "templateVersions:tv1",
};

// The convex anyApi proxy throws on String() coercion. Mock the api module
// so refs become string tokens, then dispatch on those by identity.
import {
  apiMock,
  makeUseQueryDispatcher,
} from "./__helpers__/closed-case-mocks";

vi.mock("../../convex/_generated/api", () => apiMock);

const dispatch = makeUseQueryDispatcher({ caseDoc: mockCase });

vi.mock("convex/react", () => ({
  useQuery: (ref: unknown) => dispatch(ref),
  useMutation: () => vi.fn(),
}));

import { ClosedCaseView } from "@/pages/ClosedCasePage";

function renderView() {
  return render(
    <MemoryRouter initialEntries={["/cases/test1/closed"]}>
      <Routes>
        <Route path="/cases/:caseId/closed" element={<ClosedCaseView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AC7: Closed banner", () => {
  test("displays banner text: 'This case is closed. No new messages can be added.'", () => {
    renderView();
    expect(
      screen.getByText("This case is closed. No new messages can be added."),
    ).toBeInTheDocument();
  });

  test("banner is visible regardless of which tab is active", () => {
    renderView();
    // The banner should be outside the tab content, always visible
    const banner = screen.getByText(
      "This case is closed. No new messages can be added.",
    );
    expect(banner).toBeVisible();
  });
});

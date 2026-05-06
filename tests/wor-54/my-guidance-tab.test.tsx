/**
 * WOR-54: Closed case view — My Guidance tab
 *
 * AC6: My Guidance tab shows the viewer's own synthesis text.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const mockSynthesisText =
  "## Key Areas of Agreement\n\n- Both value timely communication\n- Budget transparency is important to both parties\n\n## Suggested Approach\n\nLead with curiosity rather than accusation.";

vi.mock("convex/react", () => ({
  useQuery: (queryRef: unknown) => {
    const name = String(queryRef);
    if (name.includes("cases") || name.includes("get")) return mockCase;
    if (name.includes("myMessages") || name.includes("private")) return [];
    if (name.includes("messages") || name.includes("jointChat")) return [];
    if (name.includes("mySynthesis") || name.includes("synthesis"))
      return mockSynthesisText;
    return undefined;
  },
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

describe("AC6: My Guidance tab shows viewer's synthesis text", () => {
  test("displays synthesis content when My Guidance tab is selected", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("tab", { name: /my guidance/i }));

    // Should render the synthesis text (possibly with markdown formatting)
    expect(
      screen.getByText(/key areas of agreement/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/lead with curiosity rather than accusation/i),
    ).toBeInTheDocument();
  });

  test("synthesis content is not visible on the default Joint Chat tab", () => {
    renderView();

    expect(
      screen.queryByText(/key areas of agreement/i),
    ).not.toBeInTheDocument();
  });
});

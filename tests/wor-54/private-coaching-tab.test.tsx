/**
 * WOR-54: Closed case view — private coaching tab
 *
 * AC5: My Private Coaching tab shows only the viewer's own private
 *      coaching messages.
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

const myPrivateMessages = [
  {
    _id: "privateMessages:pm1",
    caseId: "cases:test1",
    userId: "users:u1",
    role: "USER",
    content: "I'm feeling frustrated about the project timeline.",
    status: "COMPLETE",
    createdAt: 1700000001000,
  },
  {
    _id: "privateMessages:pm2",
    caseId: "cases:test1",
    userId: "users:u1",
    role: "AI",
    content: "I understand. Let's explore what specifically frustrates you.",
    status: "COMPLETE",
    createdAt: 1700000002000,
  },
];

vi.mock("convex/react", () => ({
  useQuery: (queryRef: unknown) => {
    const name = String(queryRef);
    if (name.includes("cases") || name.includes("get")) return mockCase;
    if (name.includes("myMessages") || name.includes("private"))
      return myPrivateMessages;
    if (name.includes("messages") || name.includes("jointChat")) return [];
    if (name.includes("mySynthesis") || name.includes("synthesis")) return null;
    return undefined;
  },
  useMutation: () => vi.fn(),
}));

// @ts-expect-error WOR-54 red-state import: implementation is created by task-implement.
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

describe("AC5: My Private Coaching tab shows viewer's private messages", () => {
  test("displays the viewer's private coaching messages after clicking the tab", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(
      screen.getByRole("tab", { name: /my private coaching/i }),
    );

    expect(
      screen.getByText(
        "I'm feeling frustrated about the project timeline.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "I understand. Let's explore what specifically frustrates you.",
      ),
    ).toBeInTheDocument();
  });

  test("private coaching messages are not visible on the default Joint Chat tab", () => {
    renderView();

    // Private coaching content should NOT be visible on the joint chat tab
    expect(
      screen.queryByText(
        "I'm feeling frustrated about the project timeline.",
      ),
    ).not.toBeInTheDocument();
  });
});

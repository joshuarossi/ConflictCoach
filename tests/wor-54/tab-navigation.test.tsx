/**
 * WOR-54: Closed case view — tab navigation
 *
 * AC4: Tab navigation: Joint Chat | My Private Coaching | My Guidance.
 *      Default tab is "Joint Chat".
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

const mockJointMessages = [
  {
    _id: "jointMessages:m1",
    caseId: "cases:test1",
    authorType: "USER",
    authorUserId: "users:u1",
    content: "Joint chat message content.",
    status: "COMPLETE",
    createdAt: 1700000001000,
  },
];

const mockPrivateMessages = [
  {
    _id: "privateMessages:pm1",
    caseId: "cases:test1",
    userId: "users:u1",
    role: "USER",
    content: "My private coaching message.",
    status: "COMPLETE",
    createdAt: 1700000001000,
  },
];

const mockSynthesis = "Your guidance: approach with empathy and openness.";

// The convex anyApi proxy throws on String() coercion. Mock the api module
// so refs become string tokens, then dispatch on those by identity.
import {
  apiMock,
  makeUseQueryDispatcher,
} from "./__helpers__/closed-case-mocks";

vi.mock("../../convex/_generated/api", () => apiMock);

const dispatch = makeUseQueryDispatcher({
  caseDoc: mockCase,
  jointMessages: mockJointMessages,
  privateMessages: mockPrivateMessages,
  synthesis: mockSynthesis,
});

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

describe("AC4: Tab navigation", () => {
  test("renders three tabs: Joint Chat, My Private Coaching, My Guidance", () => {
    renderView();
    expect(
      screen.getByRole("tab", { name: /joint chat/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /my private coaching/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /my guidance/i }),
    ).toBeInTheDocument();
  });

  test("default tab is Joint Chat (selected on render)", () => {
    renderView();
    const jointTab = screen.getByRole("tab", { name: /joint chat/i });
    expect(jointTab).toHaveAttribute("aria-selected", "true");
  });

  test("clicking My Private Coaching tab shows private coaching content", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("tab", { name: /my private coaching/i }));
    expect(
      screen.getByText("My private coaching message."),
    ).toBeInTheDocument();
  });

  test("clicking My Guidance tab shows synthesis content", async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole("tab", { name: /my guidance/i }));
    expect(
      screen.getByText(/approach with empathy and openness/i),
    ).toBeInTheDocument();
  });
});

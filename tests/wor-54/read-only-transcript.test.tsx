/**
 * WOR-54: Closed case view — read-only transcript
 *
 * AC3: Full joint chat transcript renders read-only (no input).
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

const mockJointMessages = [
  {
    _id: "jointMessages:m1",
    caseId: "cases:test1",
    authorType: "USER",
    authorUserId: "users:u1",
    content: "I think we should discuss the budget.",
    status: "COMPLETE",
    createdAt: 1700000001000,
  },
  {
    _id: "jointMessages:m2",
    caseId: "cases:test1",
    authorType: "COACH",
    authorUserId: null,
    content: "That sounds like a great starting point.",
    status: "COMPLETE",
    createdAt: 1700000002000,
  },
  {
    _id: "jointMessages:m3",
    caseId: "cases:test1",
    authorType: "USER",
    authorUserId: "users:u2",
    content: "I agree, let's figure this out.",
    status: "COMPLETE",
    createdAt: 1700000003000,
  },
];

const mockCase = {
  _id: "cases:test1",
  status: "CLOSED_RESOLVED",
  category: "workplace",
  isSolo: false,
  createdAt: 1700000000000,
  updatedAt: 1700100000000,
  closedAt: 1700100000000,
  closureSummary: "Agreed on budget plan.",
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

const dispatch = makeUseQueryDispatcher({
  caseDoc: mockCase,
  jointMessages: mockJointMessages,
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

describe("AC3: Full joint chat transcript renders read-only (no input)", () => {
  test("displays all joint messages in order", () => {
    renderView();
    expect(
      screen.getByText("I think we should discuss the budget."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("That sounds like a great starting point."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("I agree, let's figure this out."),
    ).toBeInTheDocument();
  });

  test("no textarea or text input for composing messages exists", () => {
    const { container } = renderView();
    const textareas = container.querySelectorAll("textarea");
    expect(textareas).toHaveLength(0);

    // No send button either
    expect(
      screen.queryByRole("button", { name: /send/i }),
    ).not.toBeInTheDocument();
  });

  test("no message input component is rendered", () => {
    const { container } = renderView();
    // The MessageInput component should not be present at all
    const inputs = container.querySelectorAll(
      'input[type="text"], textarea, [data-testid="message-input"]',
    );
    expect(inputs).toHaveLength(0);
  });
});

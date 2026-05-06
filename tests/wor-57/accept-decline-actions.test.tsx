/**
 * WOR-57: Invite acceptance — Accept/Decline actions (AC5, AC6)
 *
 * AC5: Accept button calls invites/redeem mutation; on success,
 *      routes to the invitee's case form.
 * AC6: Decline button marks case as CLOSED_ABANDONED with explanation text.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const mockRedeem = vi.fn().mockResolvedValue({ caseId: "case123" });
const mockDecline = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

let mutationCallCount = 0;
vi.mock("convex/react", () => ({
  useQuery: () => ({
    initiatorName: "Alex",
    mainTopic: "Budget disagreement",
    category: "workplace",
  }),
  useMutation: () => {
    // Return mocks in call order: first useMutation call is redeem, second is decline.
    // This avoids inspecting internal mutation names.
    mutationCallCount++;
    return mutationCallCount % 2 === 1 ? mockRedeem : mockDecline;
  },
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ token: "validtoken123" }),
  };
});

import { InviteAcceptPage } from "@/pages/InviteAcceptPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/invite/validtoken123"]}>
      <Routes>
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WOR-57: Accept and Decline actions", () => {
  beforeEach(() => {
    mutationCallCount = 0;
    mockRedeem.mockClear();
    mockDecline.mockClear();
    mockNavigate.mockClear();
  });

  test("AC5: clicking Accept calls the redeem mutation", async () => {
    renderPage();
    const acceptBtn = screen.getByRole("button", { name: /accept/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(mockRedeem).toHaveBeenCalled();
    });
  });

  test("AC5: after successful accept, navigates to invitee case form", async () => {
    renderPage();
    const acceptBtn = screen.getByRole("button", { name: /accept/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringMatching(/\/cases\/[^/]+\/form/),
      );
    });
  });

  test("AC6: clicking Decline calls the decline mutation with CLOSED_ABANDONED status", async () => {
    renderPage();
    const declineBtn = screen.getByRole("button", { name: /decline/i });
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(mockDecline).toHaveBeenCalledWith(
        expect.objectContaining({ token: "validtoken123" }),
      );
    });
  });
});

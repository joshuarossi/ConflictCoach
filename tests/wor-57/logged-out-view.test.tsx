/**
 * WOR-57: Invite acceptance — Logged-out view (AC1)
 *
 * AC1: Logged-out view shows centered card with "[Initiator name] has invited
 * you to work through something together", product explanation, and
 * "Sign in to continue" button. No private data visible.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: false }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => ({
    initiatorName: "Alex",
    mainTopic: "Workplace disagreement",
    category: "workplace",
    // Include private fields to verify they are NOT rendered
    description: "Alex feels undervalued in team meetings",
    desiredOutcome: "Better communication and mutual respect",
  }),
  useMutation: () => vi.fn(),
}));

import { InviteAcceptPage } from "@/pages/InviteAcceptPage";

function renderPage(token = "abc123def456") {
  return render(
    <MemoryRouter initialEntries={[`/invite/${token}`]}>
      <Routes>
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WOR-57: Logged-out invite view", () => {
  test("AC1: displays initiator name in invitation message", () => {
    renderPage();
    expect(
      screen.getByText(/Alex.*has invited you to work through something together/i),
    ).toBeInTheDocument();
  });

  test("AC1: shows product explanation text", () => {
    renderPage();
    // The page should explain what Conflict Coach is
    expect(
      screen.getByText(/conflict coach/i),
    ).toBeInTheDocument();
  });

  test('AC1: shows "Sign in to continue" button', () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /sign in to continue/i }),
    ).toBeInTheDocument();
  });

  test("AC1: does NOT display private data (description, desiredOutcome)", () => {
    renderPage();
    // Assert the initiator's actual private content values are not rendered.
    // We check for content (not labels like "description") since labels
    // could legitimately appear as UI elements.
    expect(screen.queryByText(/Alex feels undervalued in team meetings/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Better communication and mutual respect/i)).not.toBeInTheDocument();
  });
});

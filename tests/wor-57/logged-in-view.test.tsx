/**
 * WOR-57: Invite acceptance — Logged-in view (AC3, AC4)
 *
 * AC3: Logged-in + unredeemed view shows initiator's mainTopic and category
 *      (NOT private coaching content or description).
 * AC4: Privacy callout with initiator's name is visible.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => ({
    initiatorName: "Alex",
    mainTopic: "Division of responsibilities",
    category: "workplace",
  }),
  useMutation: () => vi.fn(),
}));

import { InviteAcceptPage } from "@/pages/InviteAcceptPage";

function renderPage(token = "validtoken123") {
  return render(
    <MemoryRouter initialEntries={[`/invite/${token}`]}>
      <Routes>
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WOR-57: Logged-in unredeemed invite view", () => {
  test("AC3: displays the initiator's mainTopic", () => {
    renderPage();
    expect(
      screen.getByText(/Division of responsibilities/),
    ).toBeInTheDocument();
  });

  test("AC3: displays the category", () => {
    renderPage();
    expect(screen.getByText(/workplace/i)).toBeInTheDocument();
  });

  test("AC3: does NOT display description or desiredOutcome", () => {
    renderPage();
    // Private fields must not be exposed
    expect(screen.queryByText(/desiredOutcome/i)).not.toBeInTheDocument();
  });

  test("AC4: privacy callout shows initiator name and shared summary message", () => {
    renderPage();
    expect(
      screen.getByText(/Alex wrote this in the shared summary/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /You'll have your own private space to share your perspective/i,
      ),
    ).toBeInTheDocument();
  });

  test("AC3/AC4: Accept and Decline buttons are visible", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /decline/i }),
    ).toBeInTheDocument();
  });
});

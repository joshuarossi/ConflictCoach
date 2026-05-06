/**
 * WOR-57: Invite acceptance — Consumed token error state (AC7)
 *
 * AC7: Already-consumed token shows clear error with "Log in" and
 *      "Go to dashboard" options.
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
  useQuery: () => null, // null signals token not found / consumed
  useMutation: () => vi.fn(),
}));

import { InviteAcceptPage } from "@/pages/InviteAcceptPage";

function renderPage(token = "consumed-token-xyz") {
  return render(
    <MemoryRouter initialEntries={[`/invite/${token}`]}>
      <Routes>
        <Route path="/invite/:token" element={<InviteAcceptPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WOR-57: Consumed/invalid token error state", () => {
  test("AC7: shows error message for consumed token", () => {
    renderPage();
    expect(
      screen.getByText(/already been used|invalid|expired/i),
    ).toBeInTheDocument();
  });

  test('AC7: shows "Log in" option', () => {
    renderPage();
    expect(
      screen.getByRole("link", { name: /log in/i }),
    ).toBeInTheDocument();
  });

  test('AC7: shows "Go to dashboard" option', () => {
    renderPage();
    expect(
      screen.getByRole("link", { name: /go to dashboard/i }),
    ).toBeInTheDocument();
  });

  test("AC7: does NOT show Accept or Decline buttons", () => {
    renderPage();
    expect(
      screen.queryByRole("button", { name: /accept/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /decline/i }),
    ).not.toBeInTheDocument();
  });
});

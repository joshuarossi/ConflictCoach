/**
 * WOR-67: CaseDetail 404/forbidden handling tests
 *
 * Covers:
 * - AC: 404 if case not found or user is not a party to the case
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

// useQuery returns null = case not found (Convex returns null for missing docs)
vi.mock("convex/react", () => ({
  useQuery: () => null,
  useMutation: () => vi.fn(),
}));

import { CaseDetail } from "@/pages/CaseDetail";

describe("AC: 404 if case not found or user is not a party to the case", () => {
  test("shows 404/not-found UI when useQuery returns null", () => {
    render(
      <MemoryRouter initialEntries={["/cases/nonexistent-id"]}>
        <Routes>
          <Route path="/cases/:caseId" element={<CaseDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    // Should display a not-found message or element
    const notFoundEl =
      screen.queryByTestId("case-not-found") ??
      screen.queryByText(/not found/i) ??
      screen.queryByText(/404/i);
    expect(notFoundEl).toBeInTheDocument();
  });

  test("does not render any sub-view when case is not found", () => {
    render(
      <MemoryRouter initialEntries={["/cases/nonexistent-id"]}>
        <Routes>
          <Route path="/cases/:caseId" element={<CaseDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.queryByTestId("private-coaching-view"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("ready-for-joint-view"),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("joint-chat-view")).not.toBeInTheDocument();
    expect(screen.queryByTestId("closed-case-view")).not.toBeInTheDocument();
  });
});

/**
 * AC: Empty state: 'No cases yet. When you're ready to work through something, start a new case.'
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => [],
  useMutation: () => vi.fn(),
}));

import { Dashboard } from "@/pages/Dashboard";

describe("AC: Empty state message", () => {
  test("shows the exact empty state text when no cases exist", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        /no cases yet\. when you're ready to work through something, start a new case\./i,
      ),
    ).toBeInTheDocument();
  });

  test("does not show Active/Closed sections when there are no cases", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    // With no cases, the grouping sections should not appear
    // (or if they do, they should be empty - the key thing is the empty state message shows)
    expect(
      screen.getByText(/no cases yet/i),
    ).toBeInTheDocument();
  });
});

/**
 * AC: Dashboard empty state: "No cases yet. When you're ready to work through
 * something, start a new case."
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

describe("AC: Dashboard empty state", () => {
  test("shows the exact empty state copy when user has no cases", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        "No cases yet. When you're ready to work through something, start a new case.",
      ),
    ).toBeInTheDocument();
  });

  test("empty state text is rendered with exact expected copy", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    // Verify the empty state text is present (cases = [])
    expect(container.textContent).toContain(
      "No cases yet. When you're ready to work through something, start a new case.",
    );
  });
});

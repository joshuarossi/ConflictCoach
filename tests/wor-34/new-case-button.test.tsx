/**
 * AC: '+New Case' primary button routes to /cases/new
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { Dashboard } from "@/pages/Dashboard";

describe("AC: +New Case primary button routes to /cases/new", () => {
  test("renders a +New Case button/link", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    const newCaseButton = screen.queryByRole("link", { name: /new case/i }) ??
      screen.getByRole("button", { name: /new case/i });
    expect(newCaseButton).toBeInTheDocument();
  });

  test("the +New Case text includes a plus sign", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText(/\+\s*new case/i)).toBeInTheDocument();
  });

  test("clicking +New Case navigates to /cases/new", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    const newCaseButton = screen.queryByRole("link", { name: /new case/i }) ??
      screen.getByRole("button", { name: /new case/i });

    // If it's a link, verify href points to /cases/new
    const href = newCaseButton.closest("a")?.getAttribute("href");
    if (href) {
      expect(href).toBe("/cases/new");
    } else {
      // If it's a button, click and verify navigation was triggered
      await user.click(newCaseButton);
      expect(mockNavigate).toHaveBeenCalledWith("/cases/new");
    }
  });
});

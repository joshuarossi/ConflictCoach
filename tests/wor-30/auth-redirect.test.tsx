/**
 * AC: Authenticated routes redirect to /login when user is not logged in
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

// Mock Convex auth to simulate unauthenticated state
vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: false }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => null,
  useMutation: () => vi.fn(),
}));

// @ts-expect-error WOR-30 red-state import: AppRoutes is created by task-implement.
import { AppRoutes } from "@/App";

const AUTHENTICATED_ROUTES = [
  "/dashboard",
  "/cases/new",
  "/cases/case-123",
  "/cases/case-123/private",
  "/cases/case-123/joint",
  "/cases/case-123/closed",
  "/admin/templates",
  "/admin/templates/tpl-1",
  "/admin/audit",
];

describe("AC: Authenticated routes redirect to /login when not logged in", () => {
  test.each(AUTHENTICATED_ROUTES)(
    "visiting %s while unauthenticated redirects to /login",
    (path) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      );
      // Should render the login page content or a redirect indicator
      // The Sign In / Login page should be visible
      const loginIndicator =
        screen.queryByText(/sign in/i) ||
        screen.queryByText(/log in/i) ||
        screen.queryByRole("button", { name: /sign in/i }) ||
        screen.queryByRole("button", { name: /log in/i });
      expect(loginIndicator).toBeInTheDocument();
    }
  );
});

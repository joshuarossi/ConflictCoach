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
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => null,
  useMutation: () => vi.fn(),
}));

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
      // After redirect, the login page should render. Use queryAllByText
      // because "sign in" appears in both the heading and the submit button.
      const signInMatches = screen.queryAllByText(/sign in|log in/i);
      expect(signInMatches.length).toBeGreaterThan(0);
    }
  );
});

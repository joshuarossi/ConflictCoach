/**
 * AC: Admin routes check for role === 'ADMIN' and show 403 for non-admins
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

// Mock authenticated but non-admin user
vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => ({ role: "USER", displayName: "Regular User" }),
  useMutation: () => vi.fn(),
}));

// @ts-expect-error WOR-30 red-state import: AppRoutes is created by task-implement.
import { AppRoutes } from "@/App";

const ADMIN_ROUTES = [
  "/admin/templates",
  "/admin/templates/tpl-1",
  "/admin/audit",
];

describe("AC: Admin routes show 403 for non-admin users", () => {
  test.each(ADMIN_ROUTES)(
    "visiting %s as a non-admin user shows a 403/forbidden page",
    (path) => {
      render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      );
      // Should show forbidden/403 indicator
      const forbiddenIndicator =
        screen.queryByText(/403/i) ||
        screen.queryByText(/forbidden/i) ||
        screen.queryByText(/not authorized/i) ||
        screen.queryByText(/access denied/i);
      expect(forbiddenIndicator).toBeInTheDocument();
    }
  );
});

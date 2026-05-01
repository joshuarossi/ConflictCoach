/**
 * AC: All routes from TechSpec §9.2 are defined
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

// Mock Convex auth to provide unauthenticated state for route resolution
vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
}));

// Mock Convex hooks used by guards/pages
vi.mock("convex/react", () => ({
  useQuery: () => ({ role: "ADMIN", displayName: "Test User" }),
  useMutation: () => vi.fn(),
}));

// @ts-expect-error WOR-30 red-state import: AppRoutes is created by task-implement.
import { AppRoutes } from "@/App";

const REQUIRED_ROUTES = [
  "/",
  "/login",
  "/invite/test-token",
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

describe("AC: All routes from TechSpec §9.2 are defined", () => {
  test.each(REQUIRED_ROUTES)(
    "route %s resolves to a component (not a 404/fallback)",
    (path) => {
      const { container } = render(
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      );
      // A valid route should NOT render a "not found" / 404 indicator
      const notFound = container.querySelector("[data-testid='not-found']");
      const text = container.textContent || "";
      const is404 =
        notFound !== null ||
        text.includes("404") ||
        text.includes("Not Found") ||
        text.includes("Page not found");
      expect(is404).toBe(false);
    }
  );
});

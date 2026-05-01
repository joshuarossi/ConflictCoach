/**
 * AC: TopNav renders context-appropriate header:
 *     dashboard mode vs inside-case mode (with case name and phase indicator)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

// Module-level mutable ref to control useQuery return value per test
const queryResult = vi.hoisted(() => ({
  current: { role: "USER", displayName: "Alex" } as Record<string, unknown>,
}));

vi.mock("convex/react", () => ({
  useQuery: () => queryResult.current,
  useMutation: () => vi.fn(),
}));

import { AppRoutes } from "@/App";

describe("AC: TopNav renders context-appropriate header", () => {
  describe("dashboard mode", () => {
    beforeEach(() => {
      queryResult.current = { role: "USER", displayName: "Alex" };
    });

    test("dashboard mode shows a simple header without case-specific info", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>
      );
      const nav = document.querySelector("nav");
      expect(nav).toBeInTheDocument();
      // Dashboard nav should NOT contain phase indicators
      const navText = nav?.textContent || "";
      expect(navText).not.toMatch(/Private Coaching|Ready for Joint|Joint Chat|Closed/);
    });
  });

  describe("inside-case mode", () => {
    beforeEach(() => {
      queryResult.current = {
        status: "BOTH_PRIVATE_COACHING",
        otherPartyName: "Jordan",
      };
    });

    test("inside-case mode shows the other party name and phase indicator", () => {
      render(
        <MemoryRouter initialEntries={["/cases/case-123/private"]}>
          <AppRoutes />
        </MemoryRouter>
      );
      const nav = document.querySelector("nav");
      expect(nav).toBeInTheDocument();
      // Should display the other party's name somewhere within the nav
      expect(nav).toHaveTextContent(/Jordan/);
      // Should display a phase indicator within the nav (the page body may
      // also contain placeholder phase labels — assert it's in the nav).
      expect(nav).toHaveTextContent(
        /Private Coaching|Ready for Joint|Joint Chat|Closed/,
      );
    });
  });
});

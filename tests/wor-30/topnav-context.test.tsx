/**
 * AC: TopNav renders context-appropriate header:
 *     dashboard mode vs inside-case mode (with case name and phase indicator)
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import {
  makeUseQueryDispatcher,
  apiMock,
  defaultUser,
  defaultCaseGet,
  type ConvexMockOptions,
} from "../__helpers__/convex-mocks";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("../../convex/_generated/api", () => apiMock);

// Per-test mutable options so we can swap inside-case vs dashboard data.
const opts = vi.hoisted(() => ({
  current: {} as ConvexMockOptions,
}));
vi.mock("convex/react", () => ({
  useQuery: (token: string) => makeUseQueryDispatcher(opts.current)(token),
  useMutation: () => vi.fn(),
}));

import { AppRoutes } from "@/App";

describe("AC: TopNav renders context-appropriate header", () => {
  describe("dashboard mode", () => {
    beforeEach(() => {
      opts.current = {
        user: { ...defaultUser, displayName: "Alex" },
        cases: [],
      };
    });

    test("dashboard mode shows a simple header without case-specific info", () => {
      render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      const nav = document.querySelector("nav");
      expect(nav).toBeInTheDocument();
      const navText = nav?.textContent || "";
      expect(navText).not.toMatch(
        /Private Coaching|Ready for Joint|Joint Chat|Closed/,
      );
    });
  });

  describe("inside-case mode", () => {
    beforeEach(() => {
      opts.current = {
        user: { ...defaultUser, displayName: "Alex" },
        caseGet: {
          ...defaultCaseGet,
          status: "BOTH_PRIVATE_COACHING",
          otherPartyName: "Jordan",
        },
      };
    });

    test("inside-case mode shows the other party name and phase indicator", () => {
      render(
        <MemoryRouter initialEntries={["/cases/case-123/private"]}>
          <AppRoutes />
        </MemoryRouter>,
      );
      const nav = document.querySelector("nav");
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveTextContent(/Jordan/);
      expect(nav).toHaveTextContent(
        /Private Coaching|Ready for Joint|Joint Chat|Closed/,
      );
    });
  });
});

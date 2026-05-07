/**
 * WOR-84: TopNav renders PartyToggle for solo cases only
 *
 * Tests assert that TopNav integrates the PartyToggle when isSolo is true
 * and hides it otherwise. Expected to FAIL (red state) until TopNav is
 * modified to self-detect solo mode and render PartyToggle internally.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut: vi.fn() }),
}));

// We need useQuery to return different values per test, so import the mock
import { useQuery } from "convex/react";
const mockUseQuery = vi.mocked(useQuery);

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    cases: { get: "cases:get" },
    users: { me: "users:me" },
  },
}));

// Import TopNav after mocks are set up
import { TopNav } from "@/components/layout/TopNav";

function renderTopNav(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/cases/:caseId/*" element={<TopNav />} />
        <Route path="/dashboard" element={<TopNav />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("WOR-84: TopNav PartyToggle integration", () => {
  // --- AC6: PartyToggle visibility gating ---
  test("PartyToggle is rendered when caseContext.isSolo === true", () => {
    mockUseQuery.mockImplementation((queryRef: unknown) => {
      if (queryRef === "cases:get") {
        return {
          isSolo: true,
          otherPartyName: "Taylor",
          status: "BOTH_PRIVATE_COACHING",
        };
      }
      if (queryRef === "users:me") {
        return { displayName: "Test User", email: "test@example.com" };
      }
      return undefined;
    });

    renderTopNav("/cases/case-123/private");
    expect(screen.getByTestId("party-toggle")).toBeInTheDocument();
  });

  test("PartyToggle is NOT rendered when caseContext.isSolo === false", () => {
    mockUseQuery.mockImplementation((queryRef: unknown) => {
      if (queryRef === "cases:get") {
        return {
          isSolo: false,
          otherPartyName: "Taylor",
          status: "BOTH_PRIVATE_COACHING",
        };
      }
      if (queryRef === "users:me") {
        return { displayName: "Test User", email: "test@example.com" };
      }
      return undefined;
    });

    renderTopNav("/cases/case-123/private");
    expect(screen.queryByTestId("party-toggle")).not.toBeInTheDocument();
  });

  test("PartyToggle is NOT rendered on dashboard route (no caseId)", () => {
    mockUseQuery.mockImplementation((queryRef: unknown) => {
      if (queryRef === "users:me") {
        return { displayName: "Test User", email: "test@example.com" };
      }
      return undefined;
    });

    renderTopNav("/dashboard");
    expect(screen.queryByTestId("party-toggle")).not.toBeInTheDocument();
  });

  test("PartyToggle is NOT rendered while caseContext is loading (undefined)", () => {
    mockUseQuery.mockImplementation((queryRef: unknown) => {
      if (queryRef === "cases:get") {
        return undefined; // still loading
      }
      if (queryRef === "users:me") {
        return { displayName: "Test User", email: "test@example.com" };
      }
      return undefined;
    });

    renderTopNav("/cases/case-123/private");
    expect(screen.queryByTestId("party-toggle")).not.toBeInTheDocument();
  });
});

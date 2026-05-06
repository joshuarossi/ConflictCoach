/**
 * WOR-67: CaseDetail loading state tests
 *
 * Covers:
 * - AC: Loading state shows skeleton layout while case data loads
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// useQuery returning undefined = loading state in Convex
vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));

import { CaseDetail } from "@/pages/CaseDetail";

describe("AC: Loading state shows skeleton layout while case data loads", () => {
  test("shows skeleton elements when useQuery returns undefined (loading)", () => {
    render(
      <MemoryRouter initialEntries={["/cases/test-case-123"]}>
        <Routes>
          <Route path="/cases/:caseId" element={<CaseDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    // The skeleton/loading indicator should be visible
    expect(screen.getByTestId("case-detail-skeleton")).toBeInTheDocument();
  });

  test("skeleton contains at least one placeholder element (not empty)", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/cases/test-case-123"]}>
        <Routes>
          <Route path="/cases/:caseId" element={<CaseDetail />} />
        </Routes>
      </MemoryRouter>,
    );
    const skeleton = container.querySelector(
      '[data-testid="case-detail-skeleton"]',
    );
    expect(skeleton).not.toBeNull();
    // Should have child elements (skeleton placeholders)
    expect(skeleton!.children.length).toBeGreaterThan(0);
  });
});

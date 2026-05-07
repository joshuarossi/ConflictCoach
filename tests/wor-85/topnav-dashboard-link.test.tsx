/**
 * WOR-85: TopNav dashboard link tests
 *
 * Covers:
 * - AC1: Dashboard mode renders a 'Dashboard' link at /dashboard
 * - AC2: Branding wordmark styled as text-h3 font-medium text-text-primary, no hover:bg-surface-subtle
 * - AC3: Dashboard link uses nav-cluster styling
 * - AC4: Active-route indicator when on /dashboard
 * - AC5: Right-side cluster uses gap-1 (nav items) and gap-4 (cluster to UserMenu)
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));

import { TopNav } from "@/components/layout/TopNav";

function renderDashboardNav(route = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="*" element={<TopNav />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AC1: Dashboard link is a separate nav element", () => {
  test("renders a 'Dashboard' link pointing to /dashboard", () => {
    renderDashboardNav();
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  test("Dashboard link is a separate element from the branding link", () => {
    renderDashboardNav();
    const brandingLink = screen.getByText(/conflict coach/i).closest("a");
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink).not.toBe(brandingLink);
  });
});

describe("AC2: Branding wordmark styling", () => {
  test("branding uses text-h3 font-medium text-text-primary and lacks hover:bg-surface-subtle", () => {
    renderDashboardNav();
    const brandingLink = screen.getByText(/conflict coach/i).closest("a")!;
    expect(brandingLink.className).toContain("text-h3");
    expect(brandingLink.className).toContain("font-medium");
    expect(brandingLink.className).toContain("text-text-primary");
    expect(brandingLink.className).not.toContain("hover:bg-surface-subtle");
  });
});

describe("AC3: Dashboard link nav-cluster styling", () => {
  test("Dashboard link has text-label text-text-secondary px-3 py-1.5 rounded-md hover:bg-surface-subtle hover:text-text-primary", () => {
    renderDashboardNav();
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink.className).toContain("text-label");
    expect(dashboardLink.className).toContain("text-text-secondary");
    expect(dashboardLink.className).toContain("px-3");
    expect(dashboardLink.className).toContain("py-1.5");
    expect(dashboardLink.className).toContain("rounded-md");
    expect(dashboardLink.className).toContain("hover:bg-surface-subtle");
    expect(dashboardLink.className).toContain("hover:text-text-primary");
  });
});

describe("AC4: Active-route indicator on /dashboard", () => {
  test("Dashboard link has text-text-primary when on /dashboard", () => {
    renderDashboardNav("/dashboard");
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink.className).toContain("text-text-primary");
  });

  test("Dashboard link has text-text-secondary (not text-text-primary) when on a different route", () => {
    renderDashboardNav("/some-other-route");
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    expect(dashboardLink.className).toContain("text-text-secondary");
    expect(dashboardLink.className).not.toContain("text-text-primary");
  });
});

describe("AC5: Right-side cluster spacing", () => {
  test("nav-cluster container uses gap-1 and outer container uses gap-4", () => {
    renderDashboardNav();
    const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
    // The nav-cluster div is the parent of the Dashboard link
    const navCluster = dashboardLink.parentElement!;
    expect(navCluster.className).toContain("gap-1");
    // The outer right-side container wraps nav-cluster + UserMenu
    const rightSide = navCluster.parentElement!;
    expect(rightSide.className).toContain("gap-4");
  });
});

/**
 * AC: Skeleton screens (not spinners) are used for dashboard load (3 case rows),
 * case detail, and chat views when load exceeds ~300ms.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

describe("AC: Skeleton screens for loading states", () => {
  test("Dashboard renders skeleton rows when query data is undefined (loading)", async () => {
    vi.mock("convex/react", () => ({
      useQuery: () => undefined,
      useMutation: () => vi.fn(),
    }));

    const { Dashboard } = await import("@/pages/Dashboard");

    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    // Skeleton placeholders should be visible (not a spinner)
    const skeletons = container.querySelectorAll("[data-testid='skeleton-row'], [class*='skeleton'], [class*='Skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);

    // No spinner should be rendered
    const spinners = container.querySelectorAll("[class*='spinner'], [class*='Spinner'], [role='progressbar']");
    expect(spinners.length).toBe(0);
  });

  test("ConnectedPrivateCoachingView renders skeleton message bubbles when loading", async () => {
    vi.mock("convex/react", () => ({
      useQuery: () => undefined,
      useMutation: () => vi.fn(),
      useAction: () => vi.fn(),
    }));

    vi.mock("react-router-dom", async () => {
      const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
      return {
        ...actual,
        useParams: () => ({ caseId: "test-case-id" }),
      };
    });

    const { ConnectedPrivateCoachingView } = await import("@/components/PrivateCoachingView");

    const { container } = render(
      <MemoryRouter>
        <ConnectedPrivateCoachingView />
      </MemoryRouter>,
    );

    // Should show skeleton message placeholders, not spinners
    const skeletons = container.querySelectorAll("[data-testid='skeleton-message'], [class*='skeleton'], [class*='Skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  test("CaseDetailView renders skeleton placeholders when loading", async () => {
    vi.mock("convex/react", () => ({
      useQuery: () => undefined,
      useMutation: () => vi.fn(),
      useAction: () => vi.fn(),
    }));

    vi.mock("react-router-dom", async () => {
      const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
      return {
        ...actual,
        useParams: () => ({ caseId: "test-case-id" }),
      };
    });

    // @ts-expect-error WOR-69: CaseDetailView may not exist yet
    const { CaseDetailView } = await import("@/pages/CaseDetailView");

    const { container } = render(
      <MemoryRouter initialEntries={["/case/test-case-id"]}>
        <CaseDetailView />
      </MemoryRouter>,
    );

    // Should show skeleton placeholders, not spinners
    const skeletons = container.querySelectorAll("[data-testid*='skeleton'], [class*='skeleton'], [class*='Skeleton']");
    expect(skeletons.length).toBeGreaterThanOrEqual(1);

    const spinners = container.querySelectorAll("[class*='spinner'], [class*='Spinner'], [role='progressbar']");
    expect(spinners.length).toBe(0);
  });

  test("Dashboard does NOT show skeleton when data has loaded (empty array)", async () => {
    vi.mock("convex/react", () => ({
      useQuery: () => [],
      useMutation: () => vi.fn(),
    }));

    const { Dashboard } = await import("@/pages/Dashboard");

    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    const skeletons = container.querySelectorAll("[data-testid='skeleton-row'], [class*='skeleton'], [class*='Skeleton']");
    expect(skeletons.length).toBe(0);
  });
});

/**
 * AC: Skeleton screens (not spinners) are used for dashboard load (3 case rows),
 * case detail, and chat views when load exceeds ~300ms.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { useQuery } from "convex/react";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: () => vi.fn(),
  useAction: () => vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return {
    ...actual,
    useParams: () => ({ caseId: "test-case-id" }),
  };
});

const mockedUseQuery = vi.mocked(useQuery);

describe("AC: Skeleton screens for loading states", () => {
  beforeEach(() => {
    mockedUseQuery.mockReset();
  });

  test("Dashboard renders skeleton rows when query data is undefined (loading)", async () => {
    mockedUseQuery.mockReturnValue(undefined);

    const { Dashboard } = await import("@/pages/Dashboard");

    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    const skeletons = container.querySelectorAll(
      "[data-testid='skeleton-row'], [class*='skeleton'], [class*='Skeleton']",
    );
    expect(skeletons.length).toBeGreaterThanOrEqual(3);

    const spinners = container.querySelectorAll(
      "[class*='spinner'], [class*='Spinner'], [role='progressbar']",
    );
    expect(spinners.length).toBe(0);
  });

  test("ConnectedPrivateCoachingView renders skeleton message bubbles when loading", async () => {
    mockedUseQuery.mockReturnValue(undefined);

    const { ConnectedPrivateCoachingView } =
      await import("@/components/PrivateCoachingView");

    const { container } = render(
      <MemoryRouter>
        <ConnectedPrivateCoachingView />
      </MemoryRouter>,
    );

    const skeletons = container.querySelectorAll(
      "[data-testid='skeleton-message'], [data-testid*='skeleton'], [class*='skeleton'], [class*='Skeleton']",
    );
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  test("CaseDetailView renders skeleton placeholders when loading", async () => {
    mockedUseQuery.mockReturnValue(undefined);

    const { CaseDetailView } = await import("@/pages/CaseDetailView");

    const { container } = render(
      <MemoryRouter initialEntries={["/case/test-case-id"]}>
        <CaseDetailView />
      </MemoryRouter>,
    );

    const skeletons = container.querySelectorAll(
      "[data-testid*='skeleton'], [class*='skeleton'], [class*='Skeleton']",
    );
    expect(skeletons.length).toBeGreaterThanOrEqual(1);

    const spinners = container.querySelectorAll(
      "[class*='spinner'], [class*='Spinner'], [role='progressbar']",
    );
    expect(spinners.length).toBe(0);
  });

  test("Dashboard does NOT show skeleton when data has loaded (empty array)", async () => {
    mockedUseQuery.mockReturnValue([]);

    const { Dashboard } = await import("@/pages/Dashboard");

    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    const skeletons = container.querySelectorAll(
      "[data-testid='skeleton-row'], [class*='skeleton'], [class*='Skeleton']",
    );
    expect(skeletons.length).toBe(0);
  });
});

import { describe, test, expect, vi } from "vitest";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));

describe("AC: React Router v6 is configured with a placeholder route at /", () => {
  test("navigating to / renders the placeholder component", async () => {
    const { createElement } = await import("react");
    const { render } = await import("@testing-library/react");
    const { MemoryRouter } = await import("react-router-dom");

    const { default: App } = await import("@/App");

    const { container } = render(
      createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        createElement(App),
      ),
    );

    // The placeholder route at / should render some content
    expect(container.innerHTML.length).toBeGreaterThan(0);
    // There should be meaningful content (not just empty wrappers)
    expect(container.textContent?.length).toBeGreaterThan(0);
  });
});

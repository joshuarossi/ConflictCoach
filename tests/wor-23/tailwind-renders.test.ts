import { describe, test, expect, vi } from "vitest";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));

describe("AC: Tailwind utility classes render correctly in a test component", () => {
  test("a component with Tailwind classes has those classes in the DOM", async () => {
    // This import will fail until the implementation creates this component.
    // The test proves Tailwind CSS classes are applied to rendered elements.
    const { createElement } = await import("react");
    const { render } = await import("@testing-library/react");
    const { MemoryRouter } = await import("react-router-dom");

    // Import a test component that uses Tailwind classes.
    // The implementation should create src/App.tsx (or similar) with Tailwind classes.
    const { default: App } = await import("@/App");

    const { container } = render(
      createElement(MemoryRouter, { initialEntries: ["/"] }, createElement(App)),
    );

    // At least one element should have a Tailwind utility class present in the DOM
    const tailwindElement = container.querySelector(
      '[class*="bg-"], [class*="text-"], [class*="p-"], [class*="m-"], [class*="flex"], [class*="grid"]'
    );
    expect(tailwindElement).not.toBeNull();
  });
});

/**
 * AC: All error, loading, and empty states use design-token colors and consistent styling.
 */
import { describe, test, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { MessageBubble } from "@/components/MessageBubble";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

describe("AC: Design token colors for error/loading/empty states", () => {
  test("error bubble uses semantic warning token classes, not hardcoded hex", () => {
    const { container } = render(
      <MessageBubble
        role="AI"
        content="Error message"
        status="ERROR"
        onRetry={() => {}}
      />,
    );

    const html = container.innerHTML;

    // Should use semantic token classes (warning, error, etc.)
    expect(html).toMatch(/(?:border-warning|bg-warning|text-warning)/);

    // Should NOT contain hardcoded hex color values in class names
    expect(html).not.toMatch(/(?:bg|text|border)-#[0-9a-fA-F]{3,8}/);
  });

  test("empty state uses text-text-secondary token class", async () => {
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

    // The empty state text should use design token color classes
    const emptyText = container.querySelector("[class*='text-text-']");
    expect(emptyText).toBeInTheDocument();
  });

  test("skeleton loading state uses design token classes when rendered", async () => {
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

    // Skeleton elements must be present when useQuery returns undefined (loading state)
    const skeletons = container.querySelectorAll("[class*='skeleton'], [class*='Skeleton'], [data-testid*='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);

    // Skeleton elements should use token-based styling, not hardcoded hex colors
    const skeletonClasses = Array.from(skeletons).map((s) => s.className).join(" ");
    expect(skeletonClasses).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});

/**
 * AC: Max-width constraints: 720px for reading pages, 1080px for chat pages
 */
import { describe, test, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => ({ role: "USER", displayName: "Test User" }),
  useMutation: () => vi.fn(),
}));

import { AppRoutes } from "@/App";

describe("AC: Max-width constraints (720px reading, 1080px chat)", () => {
  test("reading-oriented page (/cases/new) applies max-w-[720px]", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/cases/new"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    // Look for the max-width constraint in the content wrapper
    const hasMaxWidth720 =
      main!.innerHTML.includes("max-w-[720px]") ||
      main!.querySelector("[class*='max-w-[720px]']") !== null;
    expect(hasMaxWidth720).toBe(true);
  });

  test("chat page (/cases/:id/joint) applies max-w-[1080px]", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/cases/case-123/joint"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    // Look for the max-width constraint in the content wrapper
    const hasMaxWidth1080 =
      main!.innerHTML.includes("max-w-[1080px]") ||
      main!.querySelector("[class*='max-w-[1080px]']") !== null;
    expect(hasMaxWidth1080).toBe(true);
  });

  test("dashboard page applies reading-width constraint (720px)", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    const hasMaxWidth720 =
      main!.innerHTML.includes("max-w-[720px]") ||
      main!.querySelector("[class*='max-w-[720px]']") !== null;
    expect(hasMaxWidth720).toBe(true);
  });
});

/**
 * AC: Semantic HTML landmarks are used: <main>, <nav> per DesignDoc §7.1
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

describe("AC: Semantic HTML landmarks (<main>, <nav>)", () => {
  test("layout renders a <nav> element", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    const nav = document.querySelector("nav");
    expect(nav).not.toBeNull();
  });

  test("layout renders a <main> element", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    const main = document.querySelector("main");
    expect(main).not.toBeNull();
  });

  test("page content is rendered inside <main>, not outside", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>
    );
    const main = document.querySelector("main");
    expect(main).not.toBeNull();
    // Main should have child content (not be empty)
    expect(main!.children.length).toBeGreaterThan(0);
  });
});

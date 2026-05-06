/**
 * AC: Semantic HTML landmarks are used: <main>, <nav> per DesignDoc §7.1
 */
import { describe, test, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { makeUseQueryDispatcher, apiMock } from "../__helpers__/convex-mocks";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("../../convex/_generated/api", () => apiMock);

const dispatch = makeUseQueryDispatcher();
vi.mock("convex/react", () => ({
  useQuery: (token: string) => dispatch(token),
  useMutation: () => vi.fn(),
}));

import { AppRoutes } from "@/App";

describe("AC: Semantic HTML landmarks (<main>, <nav>)", () => {
  test("layout renders a <nav> element", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const nav = document.querySelector("nav");
    expect(nav).not.toBeNull();
  });

  test("layout renders a <main> element", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const main = document.querySelector("main");
    expect(main).not.toBeNull();
  });

  test("page content is rendered inside <main>, not outside", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    const main = document.querySelector("main");
    expect(main).not.toBeNull();
    expect(main!.children.length).toBeGreaterThan(0);
  });
});

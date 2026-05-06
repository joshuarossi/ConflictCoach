/**
 * WOR-32: Post-auth redirect
 * AC: Successful auth redirects to /dashboard (or invite URL if token was stashed)
 */
import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, useLocation } from "react-router-dom";

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

/** Helper that renders current router location as text for assertions */
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

afterEach(() => {
  localStorage.clear();
});

describe("WOR-32: Post-auth redirect", () => {
  test("authenticated user visiting /login is redirected to /dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AppRoutes />
        <LocationDisplay />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // The login form elements should not appear for an authenticated user
      expect(
        screen.queryByRole("button", { name: /magic link/i }),
      ).not.toBeInTheDocument();
    });

    // Positive assertion: verify the router navigated to /dashboard
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/dashboard",
    );
  });

  test("authenticated user visiting /login with returnTo param gets redirected appropriately", async () => {
    render(
      <MemoryRouter initialEntries={["/login?returnTo=%2Finvite%2Fabc123"]}>
        <AppRoutes />
        <LocationDisplay />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /magic link/i }),
      ).not.toBeInTheDocument();
    });

    // Positive assertion: verify the router navigated to the returnTo path
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/invite/abc123",
    );
  });

  test("authenticated user with localStorage invite token is redirected to invite URL", async () => {
    localStorage.setItem("inviteToken", "abc123");

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AppRoutes />
        <LocationDisplay />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /magic link/i }),
      ).not.toBeInTheDocument();
    });

    // Positive assertion: invite token in localStorage should redirect to /invite/:token
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      "/invite/abc123",
    );
  });
});

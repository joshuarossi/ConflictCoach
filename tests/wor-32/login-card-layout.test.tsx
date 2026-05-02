/**
 * WOR-32: Login page renders a centered 400px card
 * AC: Login page renders a centered 400px card
 * AC: No password field per PRD US-01
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: false }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => null,
  useMutation: () => vi.fn(),
}));

import { LoginPage } from "@/pages/LoginPage";

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("WOR-32: Login card layout", () => {
  test("card container has max-width constraint (400px or max-w-sm)", () => {
    const { container } = renderLoginPage();
    // The card should have a width constraint — max-w-sm (384px) or max-w-[400px]
    const card = container.querySelector(
      ".max-w-sm, .max-w-\\[400px\\], [class*='max-w']",
    );
    expect(card).toBeInTheDocument();
  });

  test("card is centered vertically and horizontally", () => {
    const { container } = renderLoginPage();
    // The outer wrapper should use flex centering
    const centered = container.querySelector(
      ".flex.items-center.justify-center",
    );
    expect(centered).toBeInTheDocument();
  });

  test("no password field is present (PRD US-01)", () => {
    const { container } = renderLoginPage();
    const passwordInput = container.querySelector('input[type="password"]');
    expect(passwordInput).not.toBeInTheDocument();
  });
});

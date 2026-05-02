/**
 * WOR-32: Fine print
 * AC: Fine print 'By signing in, you agree to our Terms and Privacy Policy' is present with links
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

describe("WOR-32: Fine print", () => {
  test("Terms of Service link is present", () => {
    renderLoginPage();
    const termsLink = screen.getByRole("link", { name: /terms/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href");
  });

  test("Privacy Policy link is present", () => {
    renderLoginPage();
    const privacyLink = screen.getByRole("link", { name: /privacy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute("href");
  });

  test("fine print text mentions signing in agreement", () => {
    renderLoginPage();
    expect(
      screen.getByText(/by signing in.*agree/i),
    ).toBeInTheDocument();
  });
});

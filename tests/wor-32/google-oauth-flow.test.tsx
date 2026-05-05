/**
 * WOR-32: Google OAuth flow
 * AC: 'Continue with Google' secondary button triggers Google OAuth flow
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

const mockSignIn = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: false }),
  useAuthActions: () => ({ signIn: mockSignIn, signOut: vi.fn() }),
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

beforeEach(() => {
  mockSignIn.mockReset();
});

describe("WOR-32: Google OAuth flow", () => {
  test("'Continue with Google' button is present", () => {
    renderLoginPage();
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  test("clicking 'Continue with Google' calls signIn with google provider", async () => {
    mockSignIn.mockResolvedValue({});
    renderLoginPage();
    const user = userEvent.setup();

    const googleBtn = screen.getByRole("button", {
      name: /continue with google/i,
    });
    await user.click(googleBtn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("google");
    });
  });
});

/**
 * WOR-32: Magic link flow
 * AC: Email input + 'Send magic link' primary button triggers Convex Auth magic link flow
 * AC: After magic link sent, form replaced with 'Check your email' confirmation message
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

describe("WOR-32: Magic link flow", () => {
  test("email input and Send magic link button are present", () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /magic link/i }),
    ).toBeInTheDocument();
  });

  test("clicking Send magic link calls signIn with email provider and user email", async () => {
    mockSignIn.mockResolvedValue(undefined);
    renderLoginPage();
    const user = userEvent.setup();

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "test@example.com");

    const submitBtn = screen.getByRole("button", { name: /magic link/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("email", {
        email: "test@example.com",
      });
    });
  });

  test("after magic link sent, form is replaced with 'Check your email' message", async () => {
    mockSignIn.mockResolvedValue(undefined);
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /magic link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    // The email input and submit button should no longer be visible
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /magic link/i }),
    ).not.toBeInTheDocument();
  });
});

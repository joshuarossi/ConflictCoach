/**
 * WOR-32: Error states
 * AC: Error states render inline below the email input
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

describe("WOR-32: Error states", () => {
  test("auth error renders inline error message", async () => {
    mockSignIn.mockRejectedValue(new Error("Invalid email address"));
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), "bad@example.com");
    await user.click(screen.getByRole("button", { name: /magic link/i }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/invalid email/i);
    });

    // Email input should still be visible (form not replaced)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  test("Google OAuth error renders inline error message", async () => {
    mockSignIn.mockRejectedValue(new Error("Google sign-in failed"));
    renderLoginPage();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      // Verify the alert has some error content (not empty)
      expect(alert.textContent?.trim().length).toBeGreaterThan(0);
    });
  });
});

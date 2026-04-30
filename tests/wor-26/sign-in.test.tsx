/**
 * WOR-26: SignIn component tests - authentication gateway coverage.
 *
 * Tests rendering, magic link flow, Google OAuth flow, error handling,
 * and accessibility.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignIn } from "@/components/SignIn";

// Mock the auth actions hook
const mockSignIn = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}));

describe("SignIn component", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  test("renders sign-in heading", () => {
    render(<SignIn />);
    expect(screen.getByRole("heading")).toHaveTextContent(
      /sign in to conflict coach/i,
    );
  });

  test("renders email input and magic link button", () => {
    render(<SignIn />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in with magic link/i }),
    ).toBeInTheDocument();
  });

  test("renders Google sign-in button", () => {
    render(<SignIn />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Magic link flow
  // -------------------------------------------------------------------------

  test("submitting email calls signIn with email provider", async () => {
    mockSignIn.mockResolvedValueOnce({});
    render(<SignIn />);

    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "test@example.com");
    fireEvent.submit(screen.getByRole("button", { name: /sign in with magic link/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("email", {
        email: "test@example.com",
      });
    });
  });

  test("shows confirmation message after successful magic link submission", async () => {
    mockSignIn.mockResolvedValueOnce({});
    render(<SignIn />);

    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "test@example.com");
    fireEvent.submit(screen.getByRole("button", { name: /sign in with magic link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  test("does not submit if email is empty", async () => {
    render(<SignIn />);
    fireEvent.submit(screen.getByRole("button", { name: /sign in with magic link/i }));

    // signIn should not be called
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Google OAuth flow
  // -------------------------------------------------------------------------

  test("clicking Google button calls signIn with google provider", async () => {
    mockSignIn.mockResolvedValueOnce({});
    render(<SignIn />);

    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(mockSignIn).toHaveBeenCalledWith("google");
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  test("shows error message when magic link fails", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("Network error"));
    render(<SignIn />);

    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "test@example.com");
    fireEvent.submit(screen.getByRole("button", { name: /sign in with magic link/i }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Network error");
    });
  });

  test("shows error message when Google sign-in fails", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("OAuth failed"));
    render(<SignIn />);

    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("OAuth failed");
    });
  });

  test("shows fallback error for non-Error rejection", async () => {
    mockSignIn.mockRejectedValueOnce("unknown");
    render(<SignIn />);

    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Google sign-in failed");
    });
  });

  test("clears previous error on new attempt", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("First error"));
    render(<SignIn />);

    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Second attempt succeeds
    mockSignIn.mockResolvedValueOnce({});
    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility
  // -------------------------------------------------------------------------

  test("email input has proper label association", () => {
    render(<SignIn />);
    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute("type", "email");
    expect(input).toBeRequired();
  });

  test("error message has alert role for screen readers", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("fail"));
    render(<SignIn />);

    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "a@b.com");
    fireEvent.submit(screen.getByRole("button", { name: /sign in with magic link/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});

/**
 * AC: Form errors render inline below the relevant input field.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => [],
  useMutation: () => vi.fn(),
  useAction: () => vi.fn(),
}));

import { NewCaseForm } from "@/components/NewCaseForm";

describe("AC: Form errors render inline below input fields", () => {
  test("shows inline error below required field when submitted empty", async () => {
    render(
      <MemoryRouter>
        <NewCaseForm />
      </MemoryRouter>,
    );

    // Submit form without filling required fields
    const submitButton = screen.getByRole("button", { name: /create|start|submit/i });
    fireEvent.click(submitButton);

    // Error messages should appear inline (near the input, not in a toast or alert)
    await waitFor(() => {
      const errorMessages = screen.getAllByRole("alert");
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  test("inline error is associated with the relevant input field", async () => {
    render(
      <MemoryRouter>
        <NewCaseForm />
      </MemoryRouter>,
    );

    const submitButton = screen.getByRole("button", { name: /create|start|submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Each error should be visually near/below its input via aria-describedby or similar
      const inputs = screen.getAllByRole("textbox");
      const hasDescribedError = inputs.some(
        (input) => input.getAttribute("aria-describedby") || input.getAttribute("aria-invalid") === "true",
      );
      expect(hasDescribedError).toBe(true);
    });
  });

  test("form errors do NOT use toast notifications", async () => {
    const { container } = render(
      <MemoryRouter>
        <NewCaseForm />
      </MemoryRouter>,
    );

    const submitButton = screen.getByRole("button", { name: /create|start|submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // No toast elements should appear for form validation errors
      const toasts = container.querySelectorAll("[role='status'][data-toast], [class*='toast']");
      expect(toasts.length).toBe(0);
    });
  });
});

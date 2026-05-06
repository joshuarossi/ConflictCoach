/**
 * AC: Admin templates empty state: "No templates yet. The app will use a
 * built-in default baseline."
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => [],
  useMutation: () => vi.fn(),
}));

import { TemplatesListPage } from "@/pages/admin/TemplatesListPage";

describe("AC: Admin templates empty state", () => {
  test("shows the exact empty state copy when no templates exist", () => {
    render(
      <MemoryRouter>
        <TemplatesListPage />
      </MemoryRouter>,
    );

    // AC copy "No templates yet. The app will use a built-in default
    // baseline." — page may include additional explanatory prose after it
    // (e.g. "Create a template when you want to tune…"). Substring match.
    expect(
      screen.getByText(
        /No templates yet\. The app will use a built-in default baseline\./,
      ),
    ).toBeInTheDocument();
  });

  test("empty state message is visible (not hidden or collapsed)", () => {
    render(
      <MemoryRouter>
        <TemplatesListPage />
      </MemoryRouter>,
    );

    const message = screen.getByText(
      /no templates yet/i,
    );
    expect(message).toBeVisible();
  });
});

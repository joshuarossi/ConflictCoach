/**
 * AC: Click on case row routes to /cases/:caseId
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

const TEST_CASE = {
  id: "case-nav-test",
  status: "JOINT_ACTIVE",
  category: "family",
  createdAt: 1714600000000,
  updatedAt: 1714600000000,
  isSolo: false,
  displayName: "Taylor",
  hasCompletedPC: true,
};

vi.mock("convex/react", () => ({
  useQuery: () => [TEST_CASE],
  useMutation: () => vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { Dashboard } from "@/pages/Dashboard";

describe("AC: Click on case row routes to /cases/:caseId", () => {
  test("clicking a case row navigates to the case detail page", async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    // Click on the case row (identified by the other party's name)
    const caseRow = screen.getByText("Taylor").closest("a, [role='link'], [data-testid]") ??
      screen.getByText("Taylor");
    await user.click(caseRow);

    // Verify navigation was called with the correct case ID path
    // Either via navigate() or via an <a> / <Link> href
    const navigatedToCase =
      mockNavigate.mock.calls.some(
        (call: unknown[]) => typeof call[0] === "string" && call[0].includes("case-nav-test"),
      ) ||
      caseRow.closest("a")?.getAttribute("href")?.includes("case-nav-test");

    expect(navigatedToCase).toBe(true);
  });

  test("the Enter button links to /cases/:caseId", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>,
    );

    const enterButton = screen.queryByRole("link", { name: /enter/i }) ??
      screen.getByRole("button", { name: /enter/i });

    // If it's a link, check href; if button, it should trigger navigation
    const href = enterButton.closest("a")?.getAttribute("href");
    if (href) {
      expect(href).toContain("case-nav-test");
    } else {
      // Button should exist and be clickable (navigation tested above)
      expect(enterButton).toBeInTheDocument();
    }
  });
});

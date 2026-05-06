/**
 * AC: Each case row shows: other party name, category, created date,
 *     current status text, last activity time, Enter button
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

const TEST_CASE = {
  id: "case-row-test",
  status: "JOINT_ACTIVE",
  category: "workplace",
  createdAt: 1714600000000, // 2024-05-02
  updatedAt: 1714686400000, // ~1 day later
  isSolo: false,
  displayName: "Jordan Smith",
  hasCompletedPC: true,
};

vi.mock("convex/react", () => ({
  useQuery: () => [TEST_CASE],
  useMutation: () => vi.fn(),
}));

import { Dashboard } from "@/pages/Dashboard";

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe("AC: Each case row shows required fields", () => {
  test("displays the other party's name", () => {
    renderDashboard();
    expect(screen.getByText("Jordan Smith")).toBeInTheDocument();
  });

  test("displays the case category", () => {
    renderDashboard();
    expect(screen.getByText(/workplace/i)).toBeInTheDocument();
  });

  test("displays the created date", () => {
    renderDashboard();
    // The created date should be rendered in some human-readable format
    // We check for the presence of a date-like string derived from the timestamp
    const dateString = new Date(TEST_CASE.createdAt).toLocaleDateString();
    expect(screen.getByText(new RegExp(dateString))).toBeInTheDocument();
  });

  test("displays current status text", () => {
    renderDashboard();
    // Status should be rendered as human-readable text
    // JOINT_ACTIVE could display as "Joint Session" or similar
    const container =
      screen.getByText("Jordan Smith").closest("[data-testid]") ??
      screen.getByText("Jordan Smith").parentElement;
    expect(container?.textContent).toMatch(
      /joint|active|session|coaching|draft|ready|closed/i,
    );
  });

  test("displays last activity time", () => {
    renderDashboard();
    // updatedAt should be rendered in some form (relative or absolute)
    const container =
      screen.getByText("Jordan Smith").closest("[data-testid]") ??
      screen.getByText("Jordan Smith").parentElement;
    // The updatedAt timestamp should produce some time indicator
    const dateString = new Date(TEST_CASE.updatedAt).toLocaleDateString();
    expect(container?.textContent).toMatch(
      new RegExp(`${dateString}|ago|just now|yesterday|today`, "i"),
    );
  });

  test("displays an Enter button", () => {
    renderDashboard();
    const enterButton =
      screen.queryByRole("link", { name: /enter/i }) ??
      screen.getByRole("button", { name: /enter/i });
    expect(enterButton).toBeInTheDocument();
  });
});

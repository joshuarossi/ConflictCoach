/**
 * AC: Status indicators use correct glyphs:
 *     ● green (your turn), ○ gray (waiting), ◐ amber (ready for joint), ◼ neutral (closed)
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

function makeCaseFixture(
  overrides: Partial<{
    id: string;
    status: string;
    category: string;
    createdAt: number;
    updatedAt: number;
    isSolo: boolean;
    displayName: string;
    hasCompletedPC: boolean;
  }> = {},
) {
  return {
    id: overrides.id ?? "case-1",
    status: overrides.status ?? "DRAFT_PRIVATE_COACHING",
    category: overrides.category ?? "workplace",
    createdAt: overrides.createdAt ?? 1714600000000,
    updatedAt: overrides.updatedAt ?? 1714600000000,
    isSolo: overrides.isSolo ?? false,
    displayName: overrides.displayName ?? "Jordan",
    hasCompletedPC: overrides.hasCompletedPC ?? false,
  };
}

let mockCases: ReturnType<typeof makeCaseFixture>[] = [];

vi.mock("convex/react", () => ({
  useQuery: () => mockCases,
  useMutation: () => vi.fn(),
}));

import { Dashboard } from "@/pages/Dashboard";

function renderDashboard(cases: ReturnType<typeof makeCaseFixture>[]) {
  mockCases = cases;
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe("AC: Status indicators use correct glyphs and colors", () => {
  test("your-turn status shows green filled circle ●", () => {
    // DRAFT_PRIVATE_COACHING = your turn (initiator needs to act)
    renderDashboard([
      makeCaseFixture({
        id: "c1",
        status: "DRAFT_PRIVATE_COACHING",
        displayName: "YourTurn",
      }),
    ]);

    const container =
      screen.getByText("YourTurn").closest("[data-testid]") ??
      screen.getByText("YourTurn").parentElement;
    expect(container?.textContent).toContain("●");
  });

  test("waiting status shows gray open circle ○", () => {
    // When the other party needs to act, show waiting indicator
    renderDashboard([
      makeCaseFixture({
        id: "c2",
        status: "BOTH_PRIVATE_COACHING",
        displayName: "Waiting",
        hasCompletedPC: false,
      }),
    ]);

    const container =
      screen.getByText("Waiting").closest("[data-testid]") ??
      screen.getByText("Waiting").parentElement;
    expect(container?.textContent).toContain("○");
  });

  test("ready-for-joint status shows amber half circle ◐", () => {
    renderDashboard([
      makeCaseFixture({
        id: "c3",
        status: "READY_FOR_JOINT",
        displayName: "ReadyJoint",
      }),
    ]);

    const container =
      screen.getByText("ReadyJoint").closest("[data-testid]") ??
      screen.getByText("ReadyJoint").parentElement;
    expect(container?.textContent).toContain("◐");
  });

  test("closed status shows neutral filled square ◼", () => {
    renderDashboard([
      makeCaseFixture({
        id: "c4",
        status: "CLOSED_RESOLVED",
        displayName: "Closed",
      }),
    ]);

    // Need to expand closed section or look in the DOM
    const allText = document.body.textContent ?? "";
    expect(allText).toContain("◼");
  });

  test("green glyph uses --status-active design token color", () => {
    renderDashboard([
      makeCaseFixture({
        id: "c5",
        status: "DRAFT_PRIVATE_COACHING",
        displayName: "GreenCheck",
      }),
    ]);

    // The green indicator should use the status-active color token
    const indicator =
      document.querySelector(
        "[class*='status-active'], [style*='status-active']",
      ) ?? document.querySelector(".text-\\[var\\(--status-active\\)\\]");
    // If not using CSS variable class, check for green-associated class
    const greenIndicator =
      indicator ??
      document.querySelector("[class*='green'], [class*='success']");
    expect(greenIndicator).not.toBeNull();
  });

  test("amber glyph uses --status-warning design token color", () => {
    renderDashboard([
      makeCaseFixture({
        id: "c6",
        status: "READY_FOR_JOINT",
        displayName: "AmberCheck",
      }),
    ]);

    const indicator =
      document.querySelector(
        "[class*='status-warning'], [style*='status-warning']",
      ) ?? document.querySelector("[class*='warning'], [class*='amber']");
    expect(indicator).not.toBeNull();
  });
});

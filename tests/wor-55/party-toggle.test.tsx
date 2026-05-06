/**
 * Tests for WOR-55 AC2: PartyToggle segmented control appears in top nav
 * for solo cases only, colored --coach-accent.
 *
 * The PartyToggle component does not exist yet. Tests import from a stub
 * that exports `undefined`. They will fail because the component is not
 * a real React component — correct red state.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { PartyToggle } from "./__stubs__/PartyToggle";

// Mock Convex React hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("../../convex/_generated/api", () => ({
  api: {
    cases: { get: "cases:get" },
  },
}));

// ---------------------------------------------------------------------------
// AC 2: PartyToggle visibility — solo cases only
// ---------------------------------------------------------------------------
describe("AC 2: PartyToggle appears in top nav for solo cases only", () => {
  test("PartyToggle component is exported and is a valid React component", () => {
    expect(PartyToggle).toBeDefined();
    expect(typeof PartyToggle).toBe("function");
  });

  test("PartyToggle renders when isSolo is true", () => {
    // Will fail until PartyToggle is a real component
    const Component = PartyToggle as unknown as React.ComponentType<{
      isSolo: boolean;
    }>;

    render(
      <MemoryRouter initialEntries={["/cases/test-id?as=initiator"]}>
        <Routes>
          <Route path="/cases/:caseId" element={<Component isSolo={true} />} />
        </Routes>
      </MemoryRouter>,
    );

    // Should render as a group with a party-toggle test ID
    const toggle = screen.queryByTestId("party-toggle");
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute("role", "group");
  });

  test("PartyToggle does NOT render when isSolo is false", () => {
    const Component = PartyToggle as unknown as React.ComponentType<{
      isSolo: boolean;
    }>;

    render(
      <MemoryRouter initialEntries={["/cases/test-id"]}>
        <Routes>
          <Route path="/cases/:caseId" element={<Component isSolo={false} />} />
        </Routes>
      </MemoryRouter>,
    );

    // Should not render toggle
    const toggle = screen.queryByTestId("party-toggle");
    expect(toggle).not.toBeInTheDocument();
  });

  test("PartyToggle shows two segments for initiator and invitee", () => {
    const Component = PartyToggle as unknown as React.ComponentType<{
      isSolo: boolean;
    }>;

    render(
      <MemoryRouter initialEntries={["/cases/test-id?as=initiator"]}>
        <Routes>
          <Route path="/cases/:caseId" element={<Component isSolo={true} />} />
        </Routes>
      </MemoryRouter>,
    );

    // Should show two segment options (Alex/Jordan or Initiator/Invitee)
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

/**
 * WOR-87: TopNav UserMenu right-alignment on case routes
 *
 * Tests assert the structural layout invariant: the case-route branch uses a
 * two-group justify-between layout so UserMenu is always pinned to the right
 * edge, regardless of whether PartyToggle or children render.
 *
 * Expected to FAIL (red state) until the case-route branch of TopNav is
 * restructured from a single flex row to a two-group justify-between layout.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut: vi.fn() }),
}));

import { useQuery } from "convex/react";
const mockUseQuery = vi.mocked(useQuery) as unknown as {
  mockImplementation: (fn: (ref: unknown) => unknown) => void;
};

// vi.mock paths resolve to absolute paths relative to the test file.
// TopNav imports from '../../../convex/_generated/api' (relative to
// src/components/layout/) which resolves to <root>/convex/_generated/api.
// From tests/wor-87/ that same target requires '../../convex/_generated/api'
// (only two `..` to reach project root). Using three would resolve above
// project root and the mock would silently never match TopNav's import,
// leaving useQuery un-stubbed and caseContext perpetually undefined.
vi.mock("../../convex/_generated/api", () => ({
  api: {
    cases: { get: "cases:get" },
    users: { me: "users:me" },
  },
}));

import { TopNav } from "@/components/layout/TopNav";

function renderTopNav(route: string, children?: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/cases/:caseId/*" element={<TopNav>{children}</TopNav>} />
        <Route path="/dashboard" element={<TopNav />} />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * Returns the outer flex container inside <nav> for case routes.
 * This is the div that should have justify-between after the fix.
 */
function getNavContainer(): HTMLElement {
  const nav = screen.getByRole("navigation", { name: "Case navigation" });
  // The first child div is the flex container
  const container = nav.firstElementChild as HTMLElement;
  if (!container) throw new Error("No flex container found inside <nav>");
  return container;
}

describe("WOR-87: TopNav UserMenu right-alignment", () => {
  // --- AC1: Non-solo case, no children → UserMenu flush right ---
  test("AC1: non-solo case with no children — UserMenu is rightmost via justify-between two-group layout", () => {
    mockUseQuery.mockImplementation((queryRef: unknown) => {
      if (queryRef === "cases:get") {
        return {
          isSolo: false,
          otherPartyName: "Taylor",
          status: "BOTH_PRIVATE_COACHING",
        };
      }
      if (queryRef === "users:me") {
        return { displayName: "Test User", email: "test@example.com" };
      }
      return undefined;
    });

    renderTopNav("/cases/case-123/private");

    const navContainer = getNavContainer();

    // Outer flex div uses justify-between to separate left and right groups
    expect(navContainer.className).toContain("justify-between");

    // Exactly two child groups (left and right)
    expect(navContainer.children.length).toBe(2);

    // UserMenu is inside the right group (second child)
    const rightGroup = navContainer.children[1] as HTMLElement;
    expect(
      within(rightGroup).getByTestId("user-menu-button"),
    ).toBeInTheDocument();

    // UserMenu's wrapper is the last child of the right group
    const userMenuButton = screen.getByTestId("user-menu-button");
    expect(rightGroup.lastElementChild).toContainElement(userMenuButton);
  });

  // --- AC2: Solo case → PartyToggle and UserMenu in right group, no ml-auto ---
  test("AC2: solo case — PartyToggle and UserMenu in right group, PartyToggle before UserMenu, no ml-auto", () => {
    mockUseQuery.mockImplementation((queryRef: unknown) => {
      if (queryRef === "cases:get") {
        return {
          isSolo: true,
          otherPartyName: "Taylor",
          status: "BOTH_PRIVATE_COACHING",
        };
      }
      if (queryRef === "users:me") {
        return { displayName: "Test User", email: "test@example.com" };
      }
      return undefined;
    });

    renderTopNav("/cases/case-123/private");

    const navContainer = getNavContainer();

    // Outer flex uses justify-between
    expect(navContainer.className).toContain("justify-between");

    const rightGroup = navContainer.children[1] as HTMLElement;

    // PartyToggle is in the right group
    expect(within(rightGroup).getByTestId("party-toggle")).toBeInTheDocument();

    // UserMenu is in the right group
    expect(
      within(rightGroup).getByTestId("user-menu-button"),
    ).toBeInTheDocument();

    // PartyToggle appears before UserMenu in DOM order
    const children = Array.from(rightGroup.children);
    const partyToggleIndex = children.findIndex((el) =>
      el.contains(screen.getByTestId("party-toggle")),
    );
    const userMenuIndex = children.findIndex((el) =>
      el.contains(screen.getByTestId("user-menu-button")),
    );
    expect(partyToggleIndex).toBeLessThan(userMenuIndex);

    // No ml-auto wrappers inside the right group
    expect(rightGroup.innerHTML).not.toContain("ml-auto");
  });

  // --- AC3: Non-solo case with children → children in right group left of UserMenu ---
  test("AC3: non-solo case with children — children in right group, UserMenu remains rightmost", () => {
    mockUseQuery.mockImplementation((queryRef: unknown) => {
      if (queryRef === "cases:get") {
        return {
          isSolo: false,
          otherPartyName: "Taylor",
          status: "BOTH_PRIVATE_COACHING",
        };
      }
      if (queryRef === "users:me") {
        return { displayName: "Test User", email: "test@example.com" };
      }
      return undefined;
    });

    renderTopNav("/cases/case-123/private", <span>Custom Child</span>);

    const navContainer = getNavContainer();

    // Outer flex uses justify-between
    expect(navContainer.className).toContain("justify-between");

    const rightGroup = navContainer.children[1] as HTMLElement;

    // Children render inside the right group
    expect(within(rightGroup).getByText("Custom Child")).toBeInTheDocument();

    // UserMenu's wrapper is still the last child of the right group
    const userMenuButton = screen.getByTestId("user-menu-button");
    expect(rightGroup.lastElementChild).toContainElement(userMenuButton);

    // No ml-auto wrappers
    expect(rightGroup.innerHTML).not.toContain("ml-auto");
  });

  // --- AC4: Dashboard branch unchanged ---
  test("AC4: dashboard route — justify-between layout is already correct", () => {
    mockUseQuery.mockImplementation((queryRef: unknown) => {
      if (queryRef === "users:me") {
        return { displayName: "Test User", email: "test@example.com" };
      }
      return undefined;
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<TopNav />} />
        </Routes>
      </MemoryRouter>,
    );

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const container = nav.firstElementChild as HTMLElement;

    // Dashboard branch already uses justify-between
    expect(container.className).toContain("justify-between");

    // UserMenu is in the right group
    const rightGroup = container.children[1] as HTMLElement;
    expect(
      within(rightGroup).getByTestId("user-menu-button"),
    ).toBeInTheDocument();
  });

  // --- AC6: Structural regression test — left group has case label, right group has UserMenu ---
  test("AC6: structural invariant — case-label in left group, UserMenu last in right group", () => {
    mockUseQuery.mockImplementation((queryRef: unknown) => {
      if (queryRef === "cases:get") {
        return {
          isSolo: false,
          otherPartyName: "Taylor",
          status: "BOTH_PRIVATE_COACHING",
        };
      }
      if (queryRef === "users:me") {
        return { displayName: "Test User", email: "test@example.com" };
      }
      return undefined;
    });

    renderTopNav("/cases/case-123/private");

    const navContainer = getNavContainer();

    // The left group (first child) contains the case label
    const leftGroup = navContainer.children[0] as HTMLElement;
    expect(leftGroup).toHaveTextContent(/Case with/);

    // The left group contains the back link
    expect(leftGroup).toHaveTextContent(/Back to Dashboard/);

    // The right group (second child) contains UserMenu
    const rightGroup = navContainer.children[1] as HTMLElement;
    expect(rightGroup).toContainElement(screen.getByTestId("user-menu-button"));

    // UserMenu's wrapper is the last element in the right group
    expect(rightGroup.lastElementChild).toContainElement(
      screen.getByTestId("user-menu-button"),
    );
  });
});

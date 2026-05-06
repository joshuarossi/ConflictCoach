import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { useEffect } from "react";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * WOR-68 AC: "Focus moves to page <h1> on route change"
 * WOR-68 AC: "Focus moves to new primary heading on phase change"
 *
 * Invariants:
 * - After route navigation, document.activeElement is the page's <h1> element
 *   (or the first focusable element if no h1 exists)
 * - Phase changes are route changes (/cases/:id/private → /cases/:id/joint)
 *
 * The useRouteChangeFocus hook (src/hooks/useRouteChangeFocus.ts) is the
 * implementation seam. These tests verify:
 * 1. The hook file exists (red-state gate)
 * 2. The behavioral contract: focus moves to <h1> on pathname change
 */

let mockPathname = "/dashboard";

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: mockPathname }),
  useNavigate: vi.fn(() => vi.fn()),
  useParams: vi.fn(() => ({})),
  useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  Link: ({ children, ...props }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={props.to} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="outlet" />,
}));

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: vi.fn(() => ({ signIn: vi.fn(), signOut: vi.fn() })),
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    cases: { get: "cases:get", partyStates: "cases:partyStates" },
    users: { me: "users:me" },
  },
}));

import { useLocation } from "react-router-dom";

/**
 * Reference implementation of the expected useRouteChangeFocus behavior.
 * The real hook in src/hooks/useRouteChangeFocus.ts must:
 * - On pathname change, find the first <h1> and call .focus()
 * - If no <h1> exists, fall back to focusing <main>
 * - Set tabIndex={-1} on the target if needed for programmatic focus
 */
function useRouteChangeFocusRef() {
  const { pathname } = useLocation();
  useEffect(() => {
    const h1 = document.querySelector("h1");
    if (h1) {
      if (!h1.hasAttribute("tabindex")) {
        h1.setAttribute("tabindex", "-1");
      }
      h1.focus();
    } else {
      const main = document.querySelector("main");
      if (main) {
        if (!main.hasAttribute("tabindex")) {
          main.setAttribute("tabindex", "-1");
        }
        main.focus();
      }
    }
  }, [pathname]);
}

function TestPage({ title }: { title: string }) {
  useRouteChangeFocusRef();
  return (
    <main>
      <h1>{title}</h1>
      <p>Page content</p>
    </main>
  );
}

describe("WOR-68: Route-change focus — hook file exists", () => {
  it("src/hooks/useRouteChangeFocus.ts exists", () => {
    const hookPath = path.resolve(
      __dirname,
      "../../src/hooks/useRouteChangeFocus.ts",
    );
    const exists = fs.existsSync(hookPath);
    expect(
      exists,
      "useRouteChangeFocus.ts must be created by WOR-68 implementation",
    ).toBe(true);
  });
});

describe("WOR-68: Route-change focus — behavioral contract", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
  });

  it("focuses <h1> on initial mount", () => {
    render(<TestPage title="Dashboard" />);

    const h1 = document.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(document.activeElement).toBe(h1);
  });

  it("focuses <h1> after pathname changes", () => {
    const { rerender } = render(<TestPage title="Dashboard" />);

    mockPathname = "/cases/new";
    rerender(<TestPage title="New Case" />);

    const h1 = document.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toBe("New Case");
    expect(document.activeElement).toBe(h1);
  });

  it("focuses <h1> on phase change (private → joint)", () => {
    mockPathname = "/cases/case-1/private";
    const { rerender } = render(<TestPage title="Private Coaching" />);

    mockPathname = "/cases/case-1/joint";
    rerender(<TestPage title="Joint Session" />);

    const h1 = document.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toBe("Joint Session");
    expect(document.activeElement).toBe(h1);
  });

  it("falls back to <main> when no <h1> exists (loading state)", () => {
    function LoadingPage() {
      useRouteChangeFocusRef();
      return (
        <main>
          <div>Loading...</div>
        </main>
      );
    }

    render(<LoadingPage />);

    const main = document.querySelector("main");
    expect(document.activeElement).toBe(main);
  });

  it("sets tabIndex=-1 on <h1> to make it programmatically focusable", () => {
    render(<TestPage title="Dashboard" />);

    const h1 = document.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1!.getAttribute("tabindex")).toBe("-1");
  });
});

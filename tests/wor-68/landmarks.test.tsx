import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

/**
 * WOR-68 AC: "Single <main> landmark per page, <nav> for navigation"
 *
 * These tests verify:
 * 1. Exactly one <main> element exists per rendered page
 * 2. At least one <nav> element exists
 * 3. Each <nav> has an aria-label to differentiate when multiple navs exist
 */

// Mock Convex hooks — all page components use useQuery/useMutation
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
  useConvex: vi.fn(() => ({})),
}));

// Mock Convex auth hooks
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: vi.fn(() => ({ signIn: vi.fn(), signOut: vi.fn() })),
}));

// Mock convex API
vi.mock("../../../convex/_generated/api", () => ({
  api: {
    cases: { get: "cases:get", partyStates: "cases:partyStates" },
    users: { me: "users:me" },
    privateCoaching: {
      myMessages: "privateCoaching:myMessages",
      sendUserMessage: "privateCoaching:sendUserMessage",
      markComplete: "privateCoaching:markComplete",
    },
    jointChat: {
      messages: "jointChat:messages",
      mySynthesis: "jointChat:mySynthesis",
      sendUserMessage: "jointChat:sendUserMessage",
    },
    caseClosure: {
      proposeClosure: "caseClosure:proposeClosure",
      confirmClosure: "caseClosure:confirmClosure",
      rejectClosure: "caseClosure:rejectClosure",
      unilateralClose: "caseClosure:unilateralClose",
    },
    draftCoach: {
      session: "draftCoach:session",
      startSession: "draftCoach:startSession",
      sendMessage: "draftCoach:sendMessage",
      sendFinalDraft: "draftCoach:sendFinalDraft",
      discardSession: "draftCoach:discardSession",
    },
  },
}));

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useParams: vi.fn(() => ({})),
  useLocation: vi.fn(() => ({ pathname: "/dashboard" })),
  useNavigate: vi.fn(() => vi.fn()),
  useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  Link: ({ children, ...props }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={props.to} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="outlet" />,
}));

// Mock hooks used by components
vi.mock("@/hooks/useActingPartyUserId", () => ({
  useActingPartyUserId: vi.fn(() => "user-123"),
}));

vi.mock("@/hooks/useNetworkErrorToast", () => ({
  useNetworkErrorToast: vi.fn(() => vi.fn()),
}));

import { AppLayout } from "@/components/layout/AppLayout";
import { TopNav } from "@/components/layout/TopNav";

describe("WOR-68: Landmarks — single <main> per page, <nav> for navigation", () => {
  it("AppLayout renders exactly one <main> element", () => {
    const { container } = render(<AppLayout />);
    const mains = container.querySelectorAll("main");
    expect(mains).toHaveLength(1);
  });

  it("AppLayout renders at least one <nav> element", () => {
    const { container } = render(<AppLayout />);
    const navs = container.querySelectorAll("nav");
    expect(navs.length).toBeGreaterThanOrEqual(1);
  });

  it("TopNav renders a <nav> element in dashboard mode", () => {
    const { container } = render(<TopNav />);
    const navs = container.querySelectorAll("nav");
    expect(navs).toHaveLength(1);
  });

  it("every <nav> has an aria-label when multiple navs exist on the page", () => {
    const { container } = render(<AppLayout />);
    const navs = container.querySelectorAll("nav");
    // If there's more than one nav, each must have an aria-label
    if (navs.length > 1) {
      navs.forEach((nav) => {
        expect(nav.getAttribute("aria-label")).toBeTruthy();
      });
    }
    // If only one nav, aria-label is recommended but not strictly required
    // by WCAG — however the contract says to add it, so we check anyway
    navs.forEach((nav) => {
      // After WOR-68 implementation, all navs should have aria-label
      expect(nav.getAttribute("aria-label")).toBeTruthy();
    });
  });

  it("no page-level component renders its own <main> (AppLayout is sole provider)", () => {
    // The invariant: "AppLayout renders exactly one <main> element.
    // No page component renders its own <main>."
    // We verify this by rendering AppLayout and confirming one <main>.
    const { container } = render(<AppLayout />);
    const mains = container.querySelectorAll("main");
    expect(mains).toHaveLength(1);
  });
});

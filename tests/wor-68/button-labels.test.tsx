import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

/**
 * WOR-68 AC: "All buttons have visible labels or aria-label"
 *
 * Invariant: Every <button> in the app has either non-empty textContent
 * or a non-empty aria-label.
 *
 * Tests render key interactive components and assert every <button> is labelled.
 */

// Mock Convex hooks
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

vi.mock("@/hooks/useActingPartyUserId", () => ({
  useActingPartyUserId: vi.fn(() => "user-123"),
}));

vi.mock("@/hooks/useNetworkErrorToast", () => ({
  useNetworkErrorToast: vi.fn(() => vi.fn()),
}));

import { TopNav } from "@/components/layout/TopNav";
import { MessageInput } from "@/components/MessageInput";
import { DraftCoachPanel } from "@/components/DraftCoachPanel";
import { CaseClosureModal } from "@/components/CaseClosureModal";
import { PrivateCoachingView } from "@/components/PrivateCoachingView";
import { PrivacyBanner } from "@/components/PrivacyBanner";

/**
 * Asserts every <button> in a container has either non-empty textContent
 * or a non-empty aria-label attribute.
 */
function assertAllButtonsLabelled(container: HTMLElement) {
  const buttons = container.querySelectorAll("button");
  expect(buttons.length).toBeGreaterThan(0);

  buttons.forEach((button, index) => {
    const textContent = button.textContent?.trim() ?? "";
    const ariaLabel = button.getAttribute("aria-label")?.trim() ?? "";
    const hasLabel = textContent.length > 0 || ariaLabel.length > 0;
    expect(
      hasLabel,
      `Button #${index} has no visible text or aria-label. ` +
        `outerHTML: ${button.outerHTML.slice(0, 200)}`,
    ).toBe(true);
  });
}

describe("WOR-68: Button labels — all buttons have visible labels or aria-label", () => {
  it("TopNav buttons are all labelled", () => {
    const { container } = render(<TopNav />);
    assertAllButtonsLabelled(container);
  });

  it("MessageInput buttons are all labelled", () => {
    const { container } = render(
      <MessageInput onSend={vi.fn()} />,
    );
    assertAllButtonsLabelled(container);
  });

  it("DraftCoachPanel buttons are all labelled", () => {
    const { container } = render(
      <DraftCoachPanel
        isOpen={true}
        onClose={vi.fn()}
        otherPartyName="Jordan"
        messages={[]}
        onSendMessage={vi.fn()}
        onDraftItForMe={vi.fn()}
      />,
    );
    assertAllButtonsLabelled(container);
  });

  it("CaseClosureModal buttons are all labelled", () => {
    render(
      <CaseClosureModal
        open={true}
        onOpenChange={vi.fn()}
        otherPartyName="Jordan"
        onProposeClosure={vi.fn()}
        onUnilateralClose={vi.fn()}
      />,
    );
    // CaseClosureModal uses Radix Dialog which renders via Portal,
    // so buttons are in document.body, not the render container
    assertAllButtonsLabelled(document.body);
  });

  it("PrivateCoachingView buttons are all labelled", () => {
    const { container } = render(
      <PrivateCoachingView
        otherPartyName="Jordan"
        messages={[]}
        isCompleted={false}
        isStreaming={false}
        onSendMessage={vi.fn()}
        onMarkComplete={vi.fn()}
      />,
    );
    assertAllButtonsLabelled(container);
  });

  it("PrivacyBanner buttons are all labelled", () => {
    const { container } = render(
      <PrivacyBanner text="This conversation is private." />,
    );
    assertAllButtonsLabelled(container);
  });
});

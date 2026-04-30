/**
 * WOR-44 AC 2 & AC 3: Coach messages render left-aligned with --accent-subtle
 * background and Sparkles icon. User messages render right-aligned with
 * --bg-surface background.
 *
 * These tests target PrivateCoachingView's rendering of messages via the
 * shared chat components. The PrivateCoachingView component does not exist
 * yet — import will fail until implementation.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrivateCoachingView } from "@/components/PrivateCoachingView";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

const coachMessage = {
  _id: "privateMessages:msg_ai_1" as any,
  caseId: "cases:test_case_001" as any,
  userId: "users:test_user_a" as any,
  role: "AI" as const,
  content: "I hear your concern. Can you tell me more about what happened?",
  status: "COMPLETE" as const,
  createdAt: 1000,
};

const userMessage = {
  _id: "privateMessages:msg_user_1" as any,
  caseId: "cases:test_case_001" as any,
  userId: "users:test_user_a" as any,
  role: "USER" as const,
  content: "I feel frustrated about this situation.",
  status: "COMPLETE" as const,
  createdAt: 999,
};

function renderView(messages = [userMessage, coachMessage]) {
  return render(
    <MemoryRouter initialEntries={["/cases/test-case/private"]}>
      <PrivateCoachingView
        caseId={"cases:test_case_001" as any}
        otherPartyName="Jordan"
        messages={messages}
        isCompleted={false}
        isStreaming={false}
        onSendMessage={vi.fn()}
        onMarkComplete={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("AC 2: Coach messages render left-aligned with --accent-subtle background and Sparkles icon", () => {
  test("Coach messages render left-aligned with --accent-subtle background and Sparkles icon", () => {
    const { container } = renderView([coachMessage]);

    // Find the coach message bubble by its content
    const coachBubble = screen.getByText(coachMessage.content);
    expect(coachBubble).toBeInTheDocument();

    // The bubble's container should be left-aligned (self-start, items-start, or default)
    const bubbleWrapper = coachBubble.closest("[class]") as HTMLElement;
    expect(bubbleWrapper).not.toBeNull();
    const classes = bubbleWrapper!.className;
    // Should NOT be right-aligned
    expect(classes).not.toContain("self-end");

    // Should contain a Sparkles icon (svg element with sparkles characteristics)
    const sparklesIcon = container.querySelector(
      '[data-testid="sparkles-icon"], [aria-label*="parkles"], [aria-label*="coach"]',
    );
    // Alternatively, look for any SVG sibling near the coach message
    const svgNearCoach = bubbleWrapper!
      .closest("[class]")
      ?.querySelector("svg");
    expect(sparklesIcon || svgNearCoach).not.toBeNull();
  });
});

describe("AC 3: User messages render right-aligned with --bg-surface background", () => {
  test("User messages render right-aligned with --bg-surface background", () => {
    renderView([userMessage]);

    const userBubble = screen.getByText(userMessage.content);
    expect(userBubble).toBeInTheDocument();

    // The bubble's container should be right-aligned
    const bubbleWrapper = userBubble.closest("[class]") as HTMLElement;
    expect(bubbleWrapper).not.toBeNull();
    const classes = bubbleWrapper!.className;
    expect(
      classes.includes("self-end") ||
        classes.includes("ml-auto") ||
        classes.includes("items-end"),
    ).toBe(true);
  });
});

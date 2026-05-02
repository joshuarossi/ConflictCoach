import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
// @ts-expect-error WOR-49 red-state import: implementation is created by task-implement.
import { JointChatView } from "@/components/JointChatView";

/**
 * AC: 'Coach is thinking...' indicator shows during coach AI generation
 *
 * When isStreaming=true OR a message has status=STREAMING, the view must
 * display a "Coach is thinking..." or equivalent streaming indicator.
 * When streaming ends, the indicator must disappear.
 */

const baseProps = {
  currentUserId: "user-alice",
  initiatorUserId: "user-alice",
  inviteeUserId: "user-jordan",
  initiatorName: "Alice",
  inviteeName: "Jordan",
  caseName: "Workplace dispute",
  onSendMessage: vi.fn(),
  onOpenDraftCoach: vi.fn(),
  onOpenGuidance: vi.fn(),
  onOpenClosure: vi.fn(),
};

describe("JointChatView — coach is thinking indicator", () => {
  it("shows streaming indicator when isStreaming is true", () => {
    render(
      <JointChatView {...baseProps} messages={[]} isStreaming={true} />,
    );

    // The indicator should contain "thinking" or "replying" text
    // (may be in sr-only span for accessibility)
    const indicator =
      screen.queryByText(/coach is thinking/i) ??
      screen.queryByText(/coach is replying/i) ??
      screen.queryByRole("status");
    expect(indicator).not.toBeNull();
  });

  it("shows streaming indicator when a message has STREAMING status", () => {
    const messages = [
      {
        _id: "msg-stream",
        authorType: "COACH" as const,
        authorUserId: undefined,
        content: "Let me think about",
        status: "STREAMING" as const,
        isIntervention: false,
        createdAt: Date.now(),
      },
    ];

    render(
      <JointChatView {...baseProps} messages={messages} isStreaming={true} />,
    );

    // A streaming cursor or status indicator should be visible
    const cursor = document.querySelector(
      '[data-testid="streaming-cursor"], [role="status"]',
    );
    expect(cursor).not.toBeNull();
  });

  it("hides streaming indicator when isStreaming is false and all messages are COMPLETE", () => {
    const messages = [
      {
        _id: "msg-done",
        authorType: "COACH" as const,
        authorUserId: undefined,
        content: "All done thinking.",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: Date.now(),
      },
    ];

    render(
      <JointChatView {...baseProps} messages={messages} isStreaming={false} />,
    );

    const thinkingText =
      screen.queryByText(/coach is thinking/i) ??
      screen.queryByText(/coach is replying/i);

    // If there's a status role element, it should not indicate streaming
    const statusEl = screen.queryByRole("status");
    const noActiveStreaming =
      thinkingText === null || (statusEl === null && thinkingText === null);
    expect(noActiveStreaming).toBe(true);
  });

  it("indicator disappears when streaming completes (rerender)", () => {
    const streamingMessages = [
      {
        _id: "msg-s",
        authorType: "COACH" as const,
        authorUserId: undefined,
        content: "Thinking...",
        status: "STREAMING" as const,
        isIntervention: false,
        createdAt: Date.now(),
      },
    ];

    const { rerender } = render(
      <JointChatView
        {...baseProps}
        messages={streamingMessages}
        isStreaming={true}
      />,
    );

    // Streaming indicator should be present
    const cursorBefore = document.querySelector(
      '[data-testid="streaming-cursor"], [role="status"]',
    );
    expect(cursorBefore).not.toBeNull();

    // Rerender with completed message
    const completedMessages = [
      {
        _id: "msg-s",
        authorType: "COACH" as const,
        authorUserId: undefined,
        content: "Thinking... done!",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: Date.now(),
      },
    ];

    rerender(
      <JointChatView
        {...baseProps}
        messages={completedMessages}
        isStreaming={false}
      />,
    );

    // Standalone streaming indicator should be gone
    const thinkingAfter =
      screen.queryByText(/coach is thinking/i) ??
      screen.queryByText(/coach is replying/i);
    expect(thinkingAfter).toBeNull();
  });
});

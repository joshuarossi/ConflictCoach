import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { JointChatView } from "@/components/JointChatView";

/**
 * AC: Messages from both parties and Coach render in real time (reactive Convex query)
 *
 * These tests verify that the JointChatView renders messages from all three
 * author types (initiator, invitee, coach) in the correct order.
 * The reactive/real-time aspect is inherent in Convex query subscriptions;
 * here we test the rendering layer.
 */

const baseProps = {
  currentUserId: "user-alice",
  initiatorUserId: "user-alice",
  inviteeUserId: "user-jordan",
  initiatorName: "Alice",
  inviteeName: "Jordan",
  caseName: "Workplace dispute",
  isStreaming: false,
  onSendMessage: vi.fn(),
  onOpenDraftCoach: vi.fn(),
  onOpenGuidance: vi.fn(),
  onOpenClosure: vi.fn(),
};

function makeMessage(
  overrides: Partial<{
    _id: string;
    authorType: "USER" | "COACH";
    authorUserId: string | undefined;
    content: string;
    status: "STREAMING" | "COMPLETE" | "ERROR";
    isIntervention: boolean;
    createdAt: number;
  }>,
) {
  return {
    _id: overrides._id ?? `msg-${Math.random().toString(36).slice(2)}`,
    authorType: overrides.authorType ?? ("USER" as const),
    authorUserId: overrides.authorUserId ?? "user-alice",
    content: overrides.content ?? "Hello",
    status: overrides.status ?? ("COMPLETE" as const),
    isIntervention: overrides.isIntervention ?? false,
    createdAt: overrides.createdAt ?? Date.now(),
  };
}

describe("JointChatView — message rendering", () => {
  it("renders messages from initiator, invitee, and coach in order", () => {
    const messages = [
      makeMessage({
        _id: "msg-1",
        authorType: "USER",
        authorUserId: "user-alice",
        content: "Hi Jordan, let's talk about this.",
        createdAt: 1000,
      }),
      makeMessage({
        _id: "msg-2",
        authorType: "USER",
        authorUserId: "user-jordan",
        content: "Sure, I'm ready to discuss.",
        createdAt: 2000,
      }),
      makeMessage({
        _id: "msg-3",
        authorType: "COACH",
        authorUserId: undefined,
        content: "Welcome to the joint session.",
        createdAt: 3000,
      }),
      makeMessage({
        _id: "msg-4",
        authorType: "USER",
        authorUserId: "user-alice",
        content: "I feel unheard in meetings.",
        createdAt: 4000,
      }),
      makeMessage({
        _id: "msg-5",
        authorType: "USER",
        authorUserId: "user-jordan",
        content: "I didn't realize that.",
        createdAt: 5000,
      }),
    ];

    render(<JointChatView {...baseProps} messages={messages} />);

    // All five messages should be present in the DOM
    expect(screen.getByText("Hi Jordan, let's talk about this.")).toBeTruthy();
    expect(screen.getByText("Sure, I'm ready to discuss.")).toBeTruthy();
    expect(screen.getByText("Welcome to the joint session.")).toBeTruthy();
    expect(screen.getByText("I feel unheard in meetings.")).toBeTruthy();
    expect(screen.getByText("I didn't realize that.")).toBeTruthy();

    // Verify the chat log container exists with role="log"
    const log = screen.getByRole("log");
    expect(log).toBeTruthy();

    // Messages should appear in document order matching chronological order
    const allText = log.textContent ?? "";
    const idx1 = allText.indexOf("Hi Jordan");
    const idx2 = allText.indexOf("Sure, I'm ready");
    const idx3 = allText.indexOf("Welcome to the joint");
    const idx4 = allText.indexOf("I feel unheard");
    const idx5 = allText.indexOf("I didn't realize");
    expect(idx1).toBeLessThan(idx2);
    expect(idx2).toBeLessThan(idx3);
    expect(idx3).toBeLessThan(idx4);
    expect(idx4).toBeLessThan(idx5);
  });

  it("renders an empty state when no messages are present", () => {
    render(<JointChatView {...baseProps} messages={[]} />);

    // The chat log should still exist, even if empty
    const log = screen.getByRole("log");
    expect(log).toBeTruthy();
  });

  it("updates when a new message is added to the list", () => {
    const messages = [
      makeMessage({
        _id: "msg-1",
        content: "First message",
        createdAt: 1000,
      }),
    ];

    const { rerender } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    expect(screen.getByText("First message")).toBeTruthy();
    expect(screen.queryByText("Second message")).toBeNull();

    // Simulate reactive update — new message appears
    const updatedMessages = [
      ...messages,
      makeMessage({
        _id: "msg-2",
        content: "Second message",
        createdAt: 2000,
      }),
    ];

    rerender(<JointChatView {...baseProps} messages={updatedMessages} />);

    expect(screen.getByText("Second message")).toBeTruthy();
  });
});

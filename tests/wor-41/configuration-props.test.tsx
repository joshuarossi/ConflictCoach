import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { MessageBubble } from "@/components/chat/MessageBubble";

function makeMessage(
  id: string,
  content: string,
  authorType: "USER" | "COACH" = "USER",
) {
  return {
    _id: id,
    content,
    authorType,
    status: "COMPLETE" as const,
    createdAt: Date.now(),
  };
}

describe("Components accept configuration props to work correctly in private coaching, joint chat, and draft coach contexts", () => {
  it("ChatWindow accepts authorColorMap to configure author colors", () => {
    const messages = [
      makeMessage("1", "Hello", "USER"),
      makeMessage("2", "Hi there", "COACH"),
    ];

    const privateCoachingColors = {
      USER: "var(--bg-surface)",
      COACH: "var(--accent-subtle)",
    };

    // Should render without error with color map config
    const { container } = render(
      <ChatWindow
        messages={messages}
        onSendMessage={vi.fn()}
        authorColorMap={privateCoachingColors}
      />,
    );
    expect(container.querySelector('[role="log"]')).not.toBeNull();
  });

  it("ChatWindow accepts isInputDisabled prop", () => {
    const { container } = render(
      <ChatWindow
        messages={[]}
        onSendMessage={vi.fn()}
        isInputDisabled={true}
      />,
    );
    // The input area should be disabled
    const input = container.querySelector("textarea, input[type='text']");
    if (input) {
      expect((input as HTMLInputElement).disabled).toBe(true);
    }
  });

  it("ChatWindow renders with joint chat context (multiple author types visible)", () => {
    const messages = [
      makeMessage("1", "I think we should discuss...", "USER"),
      makeMessage("2", "Let me help frame this.", "COACH"),
      makeMessage("3", "I agree with that point.", "USER"),
    ];

    const { container } = render(
      <ChatWindow messages={messages} onSendMessage={vi.fn()} />,
    );

    const log = container.querySelector('[role="log"]');
    expect(log).not.toBeNull();
    // All messages should be rendered
    expect(log!.children.length).toBeGreaterThanOrEqual(3);
  });

  it("MessageBubble accepts authorName and authorColor props", () => {
    const { container } = render(
      <MessageBubble
        content="A message"
        authorType="USER"
        authorName="Alex"
        authorColor="var(--private-tint)"
        status="COMPLETE"
        createdAt={Date.now()}
        onCopy={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    // Should render with the author name visible
    expect(container.textContent).toContain("Alex");
  });

  it("ChatWindow accepts showPrivacyBanner prop for private contexts", () => {
    const { container } = render(
      <ChatWindow
        messages={[]}
        onSendMessage={vi.fn()}
        showPrivacyBanner={true}
      />,
    );

    // Should show a privacy-related banner/indicator
    const banner = container.querySelector(
      '[data-testid="privacy-banner"], [class*="privacy"], [class*="banner"]',
    );
    expect(banner).not.toBeNull();
  });
});

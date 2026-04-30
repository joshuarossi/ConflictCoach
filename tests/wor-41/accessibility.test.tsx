import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { MessageBubble } from "@/components/chat/MessageBubble";

describe("Chat messages container uses role='log' with aria-live='polite' for screen reader accessibility", () => {
  it("ChatWindow container has role='log'", () => {
    const { container } = render(
      <ChatWindow messages={[]} onSendMessage={vi.fn()} />
    );

    const log = container.querySelector('[role="log"]');
    expect(log).not.toBeNull();
  });

  it("ChatWindow container has aria-live='polite'", () => {
    const { container } = render(
      <ChatWindow messages={[]} onSendMessage={vi.fn()} />
    );

    const log = container.querySelector('[role="log"]');
    expect(log).not.toBeNull();
    expect(log!.getAttribute("aria-live")).toBe("polite");
  });

  it("Copy button has an accessible label", () => {
    render(
      <MessageBubble
        content="Hello"
        authorType="COACH"
        status="COMPLETE"
        createdAt={Date.now()}
        onCopy={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    const copyButton = screen.getByRole("button", { name: /copy/i });
    expect(copyButton).toBeTruthy();
    // Should have visible text or aria-label
    const ariaLabel = copyButton.getAttribute("aria-label");
    const textContent = copyButton.textContent;
    expect(ariaLabel || textContent).toBeTruthy();
  });

  it("Retry button has an accessible label", () => {
    render(
      <MessageBubble
        content="Failed message"
        authorType="COACH"
        status="ERROR"
        createdAt={Date.now()}
        onCopy={vi.fn()}
        onRetry={vi.fn()}
      />
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeTruthy();
  });
});

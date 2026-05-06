import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { ChatWindow } from "@/components/ChatWindow";
import { StreamingIndicator } from "@/components/StreamingIndicator";

/**
 * WOR-68 AC: "Chat regions use role='log' with aria-live='polite'"
 * WOR-68 AC: "Screen readers announce 'Coach is replying' once during streaming (not per character)"
 *
 * Invariants:
 * - Chat containers always have role="log" and aria-live="polite" — never role="feed" or aria-live="assertive"
 * - StreamingIndicator announces "Coach is replying" exactly once per streaming episode, not per token
 */

describe("WOR-68: Chat aria-live — role='log' with aria-live='polite'", () => {
  it("ChatWindow container has role='log'", () => {
    const { container } = render(<ChatWindow messages={[]} />);
    const log = container.querySelector('[role="log"]');
    expect(log).not.toBeNull();
  });

  it("ChatWindow container has aria-live='polite'", () => {
    const { container } = render(<ChatWindow messages={[]} />);
    const log = container.querySelector('[role="log"]');
    expect(log).not.toBeNull();
    expect(log!.getAttribute("aria-live")).toBe("polite");
  });

  it("ChatWindow container does NOT use role='feed'", () => {
    const { container } = render(<ChatWindow messages={[]} />);
    const feed = container.querySelector('[role="feed"]');
    expect(feed).toBeNull();
  });

  it("ChatWindow container does NOT use aria-live='assertive'", () => {
    const { container } = render(<ChatWindow messages={[]} />);
    const log = container.querySelector('[role="log"]');
    expect(log).not.toBeNull();
    expect(log!.getAttribute("aria-live")).not.toBe("assertive");
  });

  it("ChatWindow has an accessible label", () => {
    const { container } = render(<ChatWindow messages={[]} />);
    const log = container.querySelector('[role="log"]');
    expect(log).not.toBeNull();
    expect(log!.getAttribute("aria-label")).toBeTruthy();
  });
});

describe("WOR-68: Streaming announcement — 'Coach is replying' announced once", () => {
  it("StreamingIndicator renders a role='status' region", () => {
    const { container } = render(<StreamingIndicator />);
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
  });

  it("StreamingIndicator contains sr-only text 'Coach is replying'", () => {
    const { container } = render(<StreamingIndicator />);
    const srOnly = container.querySelector(".sr-only");
    expect(srOnly).not.toBeNull();
    expect(srOnly!.textContent).toBe("Coach is replying");
  });

  it("StreamingIndicator shows when isStreaming=true and no STREAMING messages", () => {
    const { container } = render(
      <ChatWindow messages={[]} isStreaming={true} />,
    );
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
  });

  it("StreamingIndicator hides when a message has status=STREAMING", () => {
    const messages = [
      {
        _id: "msg-1",
        role: "AI" as const,
        content: "I'm working on...",
        status: "STREAMING" as const,
        createdAt: Date.now(),
      },
    ];
    const { container } = render(
      <ChatWindow messages={messages} isStreaming={true} />,
    );
    // The StreamingIndicator should NOT be present because a STREAMING message exists
    const status = container.querySelector('[role="status"]');
    expect(status).toBeNull();
  });

  it("StreamingIndicator re-appears for a second streaming episode", () => {
    // First episode: streaming with no STREAMING messages => indicator shows
    const { container, rerender } = render(
      <ChatWindow messages={[]} isStreaming={true} />,
    );
    expect(container.querySelector('[role="status"]')).not.toBeNull();

    // Streaming ends
    const completedMessages = [
      {
        _id: "msg-1",
        role: "AI" as const,
        content: "Done",
        status: "COMPLETE" as const,
        createdAt: Date.now(),
      },
    ];
    rerender(<ChatWindow messages={completedMessages} isStreaming={false} />);
    expect(container.querySelector('[role="status"]')).toBeNull();

    // Second episode starts
    rerender(<ChatWindow messages={completedMessages} isStreaming={true} />);
    // Indicator should show again for the new episode
    expect(container.querySelector('[role="status"]')).not.toBeNull();
  });
});

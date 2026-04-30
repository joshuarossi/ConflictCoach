import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
// @ts-expect-error — module not yet implemented (future task)
import { MessageBubble } from "@/components/chat/MessageBubble";

describe("MessageBubble handles all three status states", () => {
  const baseProps = {
    content: "Test message",
    authorType: "COACH" as const,
    createdAt: Date.now(),
    onCopy: vi.fn(),
    onRetry: vi.fn(),
  };

  it("STREAMING: displays blinking cursor, no copy button", () => {
    const { container } = render(
      <MessageBubble {...baseProps} status="STREAMING" />
    );

    // Should have a streaming/blinking cursor indicator
    const cursor = container.querySelector(
      '[data-testid="streaming-indicator"], [class*="cursor"], [class*="blink"], [class*="streaming"]'
    );
    expect(cursor).not.toBeNull();

    // Should NOT have a copy button
    const copyButton = screen.queryByRole("button", { name: /copy/i });
    expect(copyButton).toBeNull();
  });

  it("COMPLETE: shows copy button and timestamp", () => {
    const timestamp = Date.now();
    render(
      <MessageBubble {...baseProps} status="COMPLETE" createdAt={timestamp} />
    );

    // Should have a copy button
    const copyButton = screen.getByRole("button", { name: /copy/i });
    expect(copyButton).toBeTruthy();

    // Should display timestamp
    const { container } = render(
      <MessageBubble {...baseProps} status="COMPLETE" createdAt={timestamp} />
    );
    // Timestamp should be rendered somewhere (as text or datetime attr)
    const timeEl = container.querySelector("time, [data-testid='timestamp']");
    expect(timeEl).not.toBeNull();
  });

  it("ERROR: warning tint background with a Retry button", () => {
    const onRetry = vi.fn();
    const { container } = render(
      <MessageBubble
        {...baseProps}
        status="ERROR"
        onRetry={onRetry}
      />
    );

    // Should have a retry button
    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeTruthy();

    // Should have warning/error styling
    const bubble = container.firstElementChild as HTMLElement;
    const classes = bubble.className + " " + bubble.innerHTML;
    expect(
      classes.includes("warning") ||
      classes.includes("error") ||
      classes.includes("destructive") ||
      classes.includes("red") ||
      classes.includes("amber")
    ).toBe(true);
  });
});

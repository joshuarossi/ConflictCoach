import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
// @ts-expect-error — module not yet implemented (future task)
import { MessageBubble } from "@/components/chat/MessageBubble";

describe("Copy button appears only on COMPLETE messages", () => {
  const baseProps = {
    content: "Test message content",
    authorType: "COACH" as const,
    createdAt: Date.now(),
    onCopy: vi.fn(),
    onRetry: vi.fn(),
  };

  it("copy button is present when status is COMPLETE", () => {
    render(<MessageBubble {...baseProps} status="COMPLETE" />);
    const copyButton = screen.getByRole("button", { name: /copy/i });
    expect(copyButton).toBeTruthy();
  });

  it("copy button is absent when status is STREAMING", () => {
    render(<MessageBubble {...baseProps} status="STREAMING" />);
    const copyButton = screen.queryByRole("button", { name: /copy/i });
    expect(copyButton).toBeNull();
  });

  it("copy button is absent when status is ERROR", () => {
    render(<MessageBubble {...baseProps} status="ERROR" />);
    const copyButton = screen.queryByRole("button", { name: /copy/i });
    expect(copyButton).toBeNull();
  });
});

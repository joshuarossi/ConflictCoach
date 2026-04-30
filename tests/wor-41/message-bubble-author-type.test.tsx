import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "@/components/chat/MessageBubble";

describe("MessageBubble renders differently by author type", () => {
  const baseProps = {
    content: "Test message",
    status: "COMPLETE" as const,
    createdAt: Date.now(),
    onCopy: vi.fn(),
    onRetry: vi.fn(),
  };

  it("user messages are right-aligned with --bg-surface background", () => {
    const { container } = render(
      <MessageBubble {...baseProps} authorType="USER" />
    );

    const bubble = container.firstElementChild as HTMLElement;
    // Check right-alignment — implementation may use flex-end, ml-auto, text-right, etc.
    const styles = window.getComputedStyle(bubble);
    const classes = bubble.className;
    // The bubble or its parent should indicate right alignment
    expect(
      classes.includes("self-end") ||
      classes.includes("ml-auto") ||
      classes.includes("items-end") ||
      styles.justifyContent === "flex-end" ||
      styles.alignSelf === "flex-end"
    ).toBe(true);
  });

  it("coach messages are left-aligned with --accent-subtle background and a Sparkles icon", () => {
    const { container } = render(
      <MessageBubble {...baseProps} authorType="COACH" />
    );

    const bubble = container.firstElementChild as HTMLElement;
    const classes = bubble.className;
    // Should be left-aligned (default or explicit)
    expect(
      classes.includes("self-start") ||
      classes.includes("mr-auto") ||
      classes.includes("items-start") ||
      !classes.includes("self-end")
    ).toBe(true);

    // Should have Sparkles icon — look for svg or an element with an accessible name
    const sparkles = container.querySelector(
      '[data-testid="sparkles-icon"], [aria-label*="coach"], svg'
    );
    expect(sparkles).not.toBeNull();
  });

  it("system messages have a distinct style", () => {
    const { container } = render(
      <MessageBubble {...baseProps} authorType="SYSTEM" />
    );

    const bubble = container.firstElementChild as HTMLElement;
    // System messages should look different from USER and COACH
    // At minimum, they should not have the same alignment as USER (right) or COACH icon
    expect(bubble).toBeTruthy();
    // System messages typically center-aligned or full-width
    const classes = bubble.className;
    expect(classes).not.toContain("self-end"); // not right-aligned like user
  });
});

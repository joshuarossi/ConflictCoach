import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
// @ts-expect-error WOR-49 red-state import: implementation is created by task-implement.
import { JointChatView } from "@/components/JointChatView";

/**
 * AC: Timestamps appear on hover
 *
 * Timestamps should be hidden by default and become visible when the user
 * hovers over a message bubble. The timestamp element should contain a
 * human-readable time derived from the message's createdAt field.
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

describe("JointChatView — timestamps on hover", () => {
  it("timestamp is hidden by default and becomes visible on hover", () => {
    const knownTime = new Date("2026-05-01T14:30:00Z").getTime();
    const messages = [
      {
        _id: "msg-ts",
        authorType: "USER" as const,
        authorUserId: "user-alice",
        content: "Message with timestamp",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: knownTime,
      },
    ];

    const { container } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    // The component must render message content
    const messageEl = screen.getByText("Message with timestamp");
    expect(messageEl).toBeTruthy();

    // Find the bubble wrapper
    const bubble =
      messageEl.closest("[data-author-type]") ??
      messageEl.closest("[class*='bubble']") ??
      messageEl.parentElement!;

    // The timestamp should exist in the DOM but be visually hidden
    const timeEl = container.querySelector(
      "time, [data-testid='timestamp']",
    );
    expect(timeEl).not.toBeNull();

    // Before hover: timestamp should be visually hidden
    const isHiddenBefore =
      timeEl!.classList.contains("invisible") ||
      timeEl!.classList.contains("opacity-0") ||
      timeEl!.classList.contains("hidden") ||
      window.getComputedStyle(timeEl!).opacity === "0" ||
      window.getComputedStyle(timeEl!).visibility === "hidden" ||
      window.getComputedStyle(timeEl!).display === "none";
    expect(isHiddenBefore).toBe(true);

    // Hover over the bubble to reveal the timestamp
    fireEvent.mouseEnter(bubble);

    // After hover: the component should make the timestamp visible
    // (via state change, class toggle, or data attribute)
    const isVisibleAfter =
      !timeEl!.classList.contains("opacity-0") ||
      timeEl!.classList.contains("opacity-100") ||
      bubble.getAttribute("data-hovered") === "true";
    expect(isVisibleAfter).toBe(true);
  });

  it("timestamp contains a valid time representation", () => {
    const knownTime = new Date("2026-05-01T14:30:00Z").getTime();
    const messages = [
      {
        _id: "msg-ts-val",
        authorType: "USER" as const,
        authorUserId: "user-alice",
        content: "Time check message",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: knownTime,
      },
    ];

    const { container } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    // Look for a <time> element with a valid datetime attribute
    const timeEl = container.querySelector("time[datetime]");
    expect(timeEl).not.toBeNull();
    expect(timeEl!.getAttribute("datetime")).toBeTruthy();
  });
});

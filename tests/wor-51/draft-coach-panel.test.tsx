/**
 * WOR-51: DraftCoachPanel component tests
 *
 * AC2: Privacy banner in panel header — lock icon + "This is private to you.
 *      Jordan can't see what you're discussing here."
 * AC3: Chat interface within panel uses shared ChatWindow components
 *
 * These tests will FAIL until DraftCoachPanel is implemented — correct red state.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { DraftCoachPanel } from "@/components/DraftCoachPanel";

describe("AC2: Privacy banner in DraftCoachPanel header", () => {
  it("renders a lock icon in the panel header", () => {
    render(
      <DraftCoachPanel
        isOpen={true}
        otherPartyName="Jordan"
        messages={[]}
        onSendMessage={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // Lock icon should be present — look for SVG with lock-related accessible name or test id
    const lockIcon = screen.getByLabelText(/lock/i);
    expect(lockIcon).toBeInTheDocument();
  });

  it("displays privacy text with interpolated other party name", () => {
    render(
      <DraftCoachPanel
        isOpen={true}
        otherPartyName="Jordan"
        messages={[]}
        onSendMessage={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // The privacy banner must mention that the other party can't see the conversation
    expect(
      screen.getByText(/this is private to you/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Jordan can't see/i),
    ).toBeInTheDocument();
  });

  it("interpolates a different party name correctly", () => {
    render(
      <DraftCoachPanel
        isOpen={true}
        otherPartyName="Alex"
        messages={[]}
        onSendMessage={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/Alex can't see/i)).toBeInTheDocument();
  });
});

describe("AC3: Chat interface uses shared ChatWindow components", () => {
  it("renders ChatWindow with coach and user messages", () => {
    const messages = [
      {
        _id: "msg-1",
        role: "USER" as const,
        content: "I want to talk about the deadline.",
        status: "COMPLETE" as const,
        createdAt: Date.now() - 2000,
      },
      {
        _id: "msg-2",
        role: "AI" as const,
        content: "Let's explore what you'd like to communicate.",
        status: "COMPLETE" as const,
        createdAt: Date.now() - 1000,
      },
    ];

    render(
      <DraftCoachPanel
        isOpen={true}
        otherPartyName="Jordan"
        messages={messages}
        onSendMessage={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // Both messages should be visible in the chat area
    expect(
      screen.getByText("I want to talk about the deadline."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Let's explore what you'd like to communicate."),
    ).toBeInTheDocument();
  });

  it("renders a message input for composing draft coach messages", () => {
    render(
      <DraftCoachPanel
        isOpen={true}
        otherPartyName="Jordan"
        messages={[]}
        onSendMessage={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // The panel should have a text input for the user to chat with the draft coach
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });
});

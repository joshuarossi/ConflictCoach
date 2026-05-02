import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// @ts-expect-error WOR-49 red-state import: implementation is created by task-implement.
import { JointChatView } from "@/components/JointChatView";

/**
 * AC: Input area has direct text input + Send button + 'Draft with Coach'
 *     button with sparkles icon
 *
 * The joint chat input area must include:
 * 1. A text input field for composing messages
 * 2. A Send button that dispatches jointChat/sendUserMessage
 * 3. A "Draft with Coach" button with a sparkles icon
 */

const baseProps = {
  currentUserId: "user-alice",
  initiatorUserId: "user-alice",
  inviteeUserId: "user-jordan",
  initiatorName: "Alice",
  inviteeName: "Jordan",
  caseName: "Workplace dispute",
  isStreaming: false,
  messages: [],
  onSendMessage: vi.fn(),
  onOpenDraftCoach: vi.fn(),
  onOpenGuidance: vi.fn(),
  onOpenClosure: vi.fn(),
};

describe("JointChatView — input area", () => {
  it("renders a text input field", () => {
    render(<JointChatView {...baseProps} />);

    const input = screen.getByRole("textbox") ?? screen.getByLabelText(/message/i);
    expect(input).toBeTruthy();
  });

  it("renders a Send button", () => {
    render(<JointChatView {...baseProps} />);

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeTruthy();
  });

  it("renders a 'Draft with Coach' button with sparkles icon", () => {
    render(<JointChatView {...baseProps} />);

    const draftButton = screen.getByRole("button", {
      name: /draft with coach/i,
    });
    expect(draftButton).toBeTruthy();

    // The button should contain a sparkles icon (svg element)
    const svg = draftButton.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("calls onSendMessage when Send is clicked with text", async () => {
    const onSendMessage = vi.fn();
    render(<JointChatView {...baseProps} onSendMessage={onSendMessage} />);

    const input = screen.getByRole("textbox");
    const sendButton = screen.getByRole("button", { name: /send/i });

    await userEvent.type(input, "Hello from the joint chat");
    await userEvent.click(sendButton);

    expect(onSendMessage).toHaveBeenCalledWith("Hello from the joint chat");
  });

  it("calls onOpenDraftCoach when 'Draft with Coach' is clicked", async () => {
    const onOpenDraftCoach = vi.fn();
    render(
      <JointChatView {...baseProps} onOpenDraftCoach={onOpenDraftCoach} />,
    );

    const draftButton = screen.getByRole("button", {
      name: /draft with coach/i,
    });
    await userEvent.click(draftButton);

    expect(onOpenDraftCoach).toHaveBeenCalledTimes(1);
  });

  it("disables send while coach is streaming", () => {
    render(<JointChatView {...baseProps} isStreaming={true} />);

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });
});

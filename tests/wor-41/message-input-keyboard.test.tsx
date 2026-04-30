import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "@/components/chat/MessageInput";

describe("MessageInput keyboard behavior", () => {
  it("sends on Enter", async () => {
    const onSend = vi.fn();
    render(<MessageInput onSendMessage={onSend} isStreaming={false} />);

    const input = screen.getByRole("textbox");
    await userEvent.type(input, "Hello world");

    // Press Enter (without Shift)
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(onSend).toHaveBeenCalledWith("Hello world");
  });

  it("inserts a newline on Shift+Enter without sending", async () => {
    const onSend = vi.fn();
    render(<MessageInput onSendMessage={onSend} isStreaming={false} />);

    const input = screen.getByRole("textbox");
    await userEvent.type(input, "Line one");

    // Shift+Enter should NOT send
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the Send button while an AI response is streaming", () => {
    const onSend = vi.fn();
    render(<MessageInput onSendMessage={onSend} isStreaming={true} />);

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it("enables the Send button when not streaming", () => {
    const onSend = vi.fn();
    render(<MessageInput onSendMessage={onSend} isStreaming={false} />);

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).not.toBeDisabled();
  });
});

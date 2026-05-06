/**
 * AC: AI errors render inline as message bubbles with a warning tint and a Retry button
 * (per DesignDoc §6.2).
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MessageBubble } from "@/components/MessageBubble";

describe("AC: AI error inline bubble with Retry", () => {
  test("renders error message with warning tint classes", () => {
    const { container } = render(
      <MessageBubble
        role="AI"
        content="Something went wrong while generating a response."
        status="ERROR"
        onRetry={() => {}}
      />,
    );

    // Should have warning/error tint styling (border-warning, bg-warning/10)
    const errorElement = container.querySelector("[class*='warning']");
    expect(errorElement).toBeInTheDocument();
  });

  test("renders a Retry button when status is ERROR and onRetry is provided", () => {
    render(
      <MessageBubble
        role="AI"
        content="Failed to generate response."
        status="ERROR"
        onRetry={() => {}}
      />,
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  test("does NOT render Retry button when status is COMPLETE", () => {
    render(
      <MessageBubble
        role="AI"
        content="Hello!"
        status="COMPLETE"
        onRetry={() => {}}
      />,
    );

    const retryButton = screen.queryByRole("button", { name: /retry/i });
    expect(retryButton).not.toBeInTheDocument();
  });

  test("clicking Retry invokes the onRetry callback", () => {
    const onRetry = vi.fn();

    render(
      <MessageBubble
        role="AI"
        content="Error occurred."
        status="ERROR"
        onRetry={onRetry}
      />,
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test("error bubble displays the message content", () => {
    render(
      <MessageBubble
        role="AI"
        content="I encountered an error processing your request."
        status="ERROR"
        onRetry={() => {}}
      />,
    );

    expect(
      screen.getByText("I encountered an error processing your request."),
    ).toBeInTheDocument();
  });
});

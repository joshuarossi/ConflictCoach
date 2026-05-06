/**
 * AC: Network errors use toast notifications (transient, auto-dismiss)
 * rather than inline messages (per DesignDoc §6.2).
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { useNetworkErrorToast } from "@/hooks/useNetworkErrorToast";
import { Toaster } from "@/components/ui/toaster";

describe("AC: Network error toast notifications", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function TestComponent({ error }: { error: Error | null }) {
    useNetworkErrorToast(error);
    return <Toaster />;
  }

  test("displays a toast when a network error occurs", async () => {
    const networkError = new Error("Network request failed");

    render(<TestComponent error={networkError} />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  test("toast auto-dismisses after approximately 5 seconds", async () => {
    const networkError = new Error("Network request failed");

    render(<TestComponent error={networkError} />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    // Advance timers past auto-dismiss threshold
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  test("toast does NOT render inline within the chat area", () => {
    const networkError = new Error("Network request failed");

    const { container } = render(
      <div data-testid="chat-area">
        <TestComponent error={networkError} />
      </div>,
    );

    // Toast should render in a portal or overlay, not inline in chat
    const chatArea = container.querySelector("[data-testid='chat-area']");
    const inlineError = chatArea?.querySelector("[class*='error'], [class*='warning']");
    expect(inlineError).toBeNull();
  });
});

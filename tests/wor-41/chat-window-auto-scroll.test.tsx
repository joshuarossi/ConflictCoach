import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
// @ts-expect-error — module not yet implemented (future task)
import { ChatWindow } from "@/components/chat/ChatWindow";

// Minimal message fixture matching the expected shape
function makeMessage(id: string, content: string) {
  return {
    _id: id,
    content,
    authorType: "USER" as const,
    status: "COMPLETE" as const,
    createdAt: Date.now(),
  };
}

describe("ChatWindow auto-scroll behavior", () => {
  // jsdom doesn't implement layout, so we stub scrollHeight / clientHeight / scrollTop
  function mockScrollableContainer(el: HTMLElement) {
    Object.defineProperty(el, "scrollHeight", {
      get: () => 1000,
      configurable: true,
    });
    Object.defineProperty(el, "clientHeight", {
      get: () => 400,
      configurable: true,
    });
    let _scrollTop = 600; // at bottom (scrollHeight - clientHeight = 600)
    Object.defineProperty(el, "scrollTop", {
      get: () => _scrollTop,
      set: (v: number) => {
        _scrollTop = v;
      },
      configurable: true,
    });
    el.scrollTo = vi.fn(({ top }: ScrollToOptions) => {
      _scrollTop = top ?? _scrollTop;
    }) as unknown as typeof el.scrollTo;
    return {
      getScrollTop: () => _scrollTop,
      setScrollTop: (v: number) => {
        _scrollTop = v;
      },
    };
  }

  it("ChatWindow renders a scrollable message list with auto-scroll to the latest message", () => {
    const messages = [
      makeMessage("1", "Hello"),
      makeMessage("2", "World"),
    ];
    const { container } = render(
      <ChatWindow
        messages={messages}
        onSendMessage={vi.fn()}
      />
    );
    const log = container.querySelector('[role="log"]');
    expect(log).not.toBeNull();
  });

  it("auto-scroll is disabled when the user scrolls up and re-enabled when they scroll back to the bottom", () => {
    const messages = Array.from({ length: 20 }, (_, i) =>
      makeMessage(String(i), `Message ${i}`)
    );

    const { container, rerender } = render(
      <ChatWindow
        messages={messages}
        onSendMessage={vi.fn()}
      />
    );

    const log = container.querySelector('[role="log"]') as HTMLElement;
    expect(log).not.toBeNull();

    const scroll = mockScrollableContainer(log);

    // Simulate user scrolling up (scrollTop < scrollHeight - clientHeight)
    scroll.setScrollTop(100);
    act(() => {
      log.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    // Add a new message while scrolled up
    const newMessages = [
      ...messages,
      makeMessage("new-1", "New message while scrolled up"),
    ];
    rerender(
      <ChatWindow
        messages={newMessages}
        onSendMessage={vi.fn()}
      />
    );

    // Should NOT have auto-scrolled — scrollTop should remain where the user put it
    expect(scroll.getScrollTop()).toBeLessThan(500);

    // User scrolls back to bottom
    scroll.setScrollTop(600);
    act(() => {
      log.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    // Add another message — should auto-scroll now
    const moreMessages = [
      ...newMessages,
      makeMessage("new-2", "Another new message"),
    ];
    rerender(
      <ChatWindow
        messages={moreMessages}
        onSendMessage={vi.fn()}
      />
    );

    // scrollTo should have been called to scroll to bottom
    expect(log.scrollTo).toHaveBeenCalled();
  });
});

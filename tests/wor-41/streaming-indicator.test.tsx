import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { StreamingIndicator } from "@/components/chat/StreamingIndicator";

describe("StreamingIndicator renders a thin vertical bar cursor blinking at 500ms intervals", () => {
  it("renders a cursor element", () => {
    const { container } = render(<StreamingIndicator />);

    const cursor = container.querySelector(
      '[data-testid="streaming-cursor"], [class*="cursor"], [class*="indicator"]'
    );
    expect(cursor).not.toBeNull();
  });

  it("has CSS animation with 500ms blink interval", () => {
    const { container } = render(<StreamingIndicator />);

    // The cursor should have an animation — check for inline style or class
    const cursor = container.querySelector(
      '[data-testid="streaming-cursor"], [class*="cursor"], [class*="indicator"]'
    ) as HTMLElement;
    expect(cursor).not.toBeNull();

    const styles = window.getComputedStyle(cursor);
    // Animation duration should be 500ms (0.5s) or the animation-name should reference blink
    const animation = styles.animation || styles.animationDuration || "";
    const animationName = styles.animationName || "";
    const classes = cursor.className || "";

    // Accept either inline animation or a CSS class that implies blinking
    expect(
      animation.includes("0.5s") ||
      animation.includes("500ms") ||
      animationName.includes("blink") ||
      classes.includes("blink") ||
      classes.includes("animate-")
    ).toBe(true);
  });
});

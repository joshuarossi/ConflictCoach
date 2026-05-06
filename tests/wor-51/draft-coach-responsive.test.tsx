/**
 * WOR-51: DraftCoachPanel responsive layout tests
 *
 * AC10: Desktop — side panel (420px, shadow-3);
 *       Mobile (< 768px) — full-screen bottom sheet.
 *
 * These tests will FAIL until DraftCoachPanel is implemented — correct red state.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

import { DraftCoachPanel } from "@/components/DraftCoachPanel";

const baseProps = {
  isOpen: true,
  otherPartyName: "Jordan",
  messages: [],
  onSendMessage: vi.fn(),
  onClose: vi.fn(),
};

describe("AC10: Desktop side panel vs. mobile bottom sheet", () => {
  it("renders as a side panel on desktop viewports", () => {
    // Default jsdom viewport is 1024×768 (desktop)
    const { container } = render(<DraftCoachPanel {...baseProps} />);

    const panel = container.querySelector(
      "[data-testid='draft-coach-panel']",
    ) as HTMLElement | null;
    expect(panel).not.toBeNull();

    // Desktop panel should have a fixed width around 420px
    // Implementation may use inline style, Tailwind class (w-[420px]), or CSS
    const classes = panel!.className;
    const style = panel!.style;
    expect(
      classes.includes("420") ||
        style.width === "420px" ||
        style.maxWidth === "420px",
    ).toBe(true);
  });

  it("panel has shadow-3 styling on desktop", () => {
    const { container } = render(<DraftCoachPanel {...baseProps} />);

    const panel = container.querySelector(
      "[data-testid='draft-coach-panel']",
    ) as HTMLElement | null;
    expect(panel).not.toBeNull();

    // Shadow-3 should be applied via class or inline style
    const classes = panel!.className;
    const style = window.getComputedStyle(panel!);
    const hasShadowClass = classes.includes("shadow");
    const hasShadowStyle =
      style.boxShadow !== "" && style.boxShadow !== "none";
    expect(hasShadowClass || hasShadowStyle).toBe(true);
  });

  it("renders as a full-screen bottom sheet on mobile viewports", () => {
    // This test requires the component to use a JS-based viewport hook
    // (e.g., useMediaQuery) to switch between side-panel and bottom-sheet
    // layouts, since jsdom does not evaluate CSS media queries or Tailwind
    // responsive prefixes.
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });
    window.dispatchEvent(new Event("resize"));

    const { container } = render(<DraftCoachPanel {...baseProps} />);

    const panel = container.querySelector(
      "[data-testid='draft-coach-panel']",
    ) as HTMLElement | null;
    expect(panel).not.toBeNull();

    // On mobile the component should set a data-layout attribute to
    // "bottom-sheet" (or equivalent mobile-specific class).
    const layout = panel!.getAttribute("data-layout");
    const classes = panel!.className;
    expect(
      layout === "bottom-sheet" || classes.includes("bottom-sheet"),
    ).toBe(true);

    // Reset viewport
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    window.dispatchEvent(new Event("resize"));
  });

  it("does NOT render as bottom-sheet on desktop viewports", () => {
    // Default jsdom viewport is 1024×768 (desktop)
    const { container } = render(<DraftCoachPanel {...baseProps} />);

    const panel = container.querySelector(
      "[data-testid='draft-coach-panel']",
    ) as HTMLElement | null;
    expect(panel).not.toBeNull();

    const layout = panel!.getAttribute("data-layout");
    expect(layout).not.toBe("bottom-sheet");
    expect(panel!.className).not.toContain("bottom-sheet");
  });
});

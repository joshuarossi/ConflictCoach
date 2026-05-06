import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Button } from "@/components/ui/button";

/**
 * WOR-68 AC: "Focus rings: --accent, 2px outline + 2px offset, never removed"
 *
 * Invariants:
 * - Every interactive element shows a focus ring on :focus-visible using
 *   outline: 2px solid var(--accent); outline-offset: 2px
 * - Never outline: none on :focus-visible
 * - The current codebase uses focus-visible:outline-none focus-visible:ring-1
 *   which must be replaced with the --accent 2px pattern
 *
 * Note: jsdom has limited computed style support, so these tests verify
 * CSS class presence rather than actual computed values.
 */

describe("WOR-68: Focus rings — --accent, 2px outline + 2px offset", () => {
  it("Button uses focus-visible outline classes (not outline-none + ring)", () => {
    const { container } = render(<Button>Click me</Button>);
    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    const className = button!.className;

    // After WOR-68 implementation, button should use outline-based focus:
    // focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2
    // It should NOT use focus-visible:outline-none with ring-based focus
    expect(className).not.toContain("focus-visible:outline-none");
    expect(className).not.toContain("focus-visible:ring-1");

    // Should have the new outline-based focus pattern
    expect(className).toMatch(/focus-visible:outline/);
  });

  it("Button does not suppress focus outline with outline-none", () => {
    const { container } = render(<Button variant="default">Primary</Button>);
    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    // After WOR-68, focus-visible should never be suppressed
    expect(button!.className).not.toContain("focus-visible:outline-none");
  });

  it("Button variant='ghost' does not suppress focus outline", () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    expect(button!.className).not.toContain("focus-visible:outline-none");
  });

  it("Button variant='outline' does not suppress focus outline", () => {
    const { container } = render(<Button variant="outline">Outline</Button>);
    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    expect(button!.className).not.toContain("focus-visible:outline-none");
  });

  it("Button variant='link' does not suppress focus outline", () => {
    const { container } = render(<Button variant="link">Link</Button>);
    const button = container.querySelector("button");
    expect(button).not.toBeNull();

    expect(button!.className).not.toContain("focus-visible:outline-none");
  });
});

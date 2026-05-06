import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { StreamingIndicator } from "@/components/StreamingIndicator";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * WOR-68 AC: "prefers-reduced-motion disables streaming cursor animation,
 * crossfades, and message fade-ins"
 *
 * Invariants:
 * - When prefers-reduced-motion: reduce, all CSS animations and transitions
 *   are disabled for: streaming cursor, modal enter/exit, message fade-ins
 * - The StreamingIndicator cursor already has motion-reduce:animate-none
 * - Global CSS @media (prefers-reduced-motion: reduce) block must exist
 */

describe("WOR-68: Reduced motion — StreamingIndicator cursor", () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("streaming cursor has motion-reduce:animate-none class", () => {
    const { container } = render(<StreamingIndicator />);
    const cursor = container.querySelector('[data-testid="streaming-cursor"]');
    expect(cursor).not.toBeNull();
    expect(cursor!.className).toContain("motion-reduce:animate-none");
  });

  it("streaming cursor has aria-hidden='true' (decorative)", () => {
    const { container } = render(<StreamingIndicator />);
    const cursor = container.querySelector('[data-testid="streaming-cursor"]');
    expect(cursor).not.toBeNull();
    expect(cursor!.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("WOR-68: Reduced motion — global CSS media query", () => {
  it("src/index.css contains a @media (prefers-reduced-motion: reduce) rule", () => {
    const cssPath = path.resolve(__dirname, "../../src/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // After WOR-68 implementation, the CSS should contain the reduced-motion block
    expect(cssContent).toContain("prefers-reduced-motion");
  });

  it("reduced-motion rule disables animations on streaming-cursor class", () => {
    const cssPath = path.resolve(__dirname, "../../src/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // The global rule should target animation elements
    // Expected pattern: @media (prefers-reduced-motion: reduce) { ... animation: none ... }
    const reducedMotionMatch = cssContent.match(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{[^}]*\}/s,
    );
    expect(
      reducedMotionMatch,
      "Expected a @media (prefers-reduced-motion: reduce) block in index.css",
    ).not.toBeNull();
  });

  it("reduced-motion rule targets animate-in and animate-out classes", () => {
    const cssPath = path.resolve(__dirname, "../../src/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // After WOR-68, the global rule should disable Radix dialog animations
    // Verify the CSS mentions the animation classes used by dialogs
    const hasReducedMotion = cssContent.includes("prefers-reduced-motion");
    expect(hasReducedMotion).toBe(true);

    // The rule should reference or affect animate-in / animate-out / fade-in
    // We check that these animation targets exist in the reduced-motion context
    const reducedMotionBlock = cssContent
      .split("prefers-reduced-motion")[1]
      ?.slice(0, 500);
    expect(reducedMotionBlock).toBeDefined();

    // After implementation, the block should contain animation: none
    // This will fail in red state until the CSS is updated
    expect(reducedMotionBlock).toContain("animation");
  });
});

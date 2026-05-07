/**
 * AC 5: Visual style matches style-guide §08: persistent banner, lock icon IS decorative
 * Updated for WOR-86: lock icon is now aria-hidden, not a button.
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe("AC 5: Visual style matches style-guide §08: persistent banner, lock icon is decorative", () => {
  test("lock icon is decorative (aria-hidden, not a button)", () => {
    const { container } = render(<PrivacyBanner />);

    // Per WOR-86 / style-guide §08: the lock icon is decorative.
    // It must NOT be wrapped in a button.
    expect(
      screen.queryByRole("button", { name: /lock/i }),
    ).not.toBeInTheDocument();

    // The SVG should have aria-hidden="true"
    const lockSvg = container.querySelector("svg.lucide-lock");
    expect(lockSvg).toHaveAttribute("aria-hidden", "true");
  });

  test("banner is persistent (no dismiss/close button on the banner itself)", () => {
    const { container } = render(<PrivacyBanner />);

    const banner = container.firstElementChild as HTMLElement;
    // The banner should not have a dismiss/close button
    // (close buttons are only in the modal, not on the banner)
    const bannerButtons = banner.querySelectorAll("button");
    for (const btn of bannerButtons) {
      // None of the banner-level buttons should be a "dismiss" or "close" for the banner
      const label = btn.getAttribute("aria-label") || btn.textContent || "";
      expect(label.toLowerCase()).not.toMatch(/dismiss|close|hide/);
    }
  });

  test("snapshot: PrivacyBanner renders expected structure", () => {
    const { container } = render(<PrivacyBanner />);

    // Snapshot test to catch unintended visual regressions
    expect(container.firstElementChild).toMatchSnapshot();
  });
});

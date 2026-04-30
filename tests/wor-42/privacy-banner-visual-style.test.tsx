/**
 * AC 5: Visual style matches DesignDoc §4.7: persistent banner, lock icon is not decorative
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe("AC 5: Visual style matches DesignDoc §4.7: persistent banner, lock icon is not decorative", () => {
  test("lock icon is not decorative (has aria-label, not aria-hidden)", () => {
    render(<PrivacyBanner text="Private" />);

    // The lock icon button must be interactive and accessible.
    // It must NOT have aria-hidden="true" since it is functional.
    const lockButton = screen.getByRole("button", { name: /lock/i });
    expect(lockButton).not.toHaveAttribute("aria-hidden", "true");

    // The button should have an accessible name
    expect(lockButton).toHaveAccessibleName();
  });

  test("banner is persistent (no dismiss/close button on the banner itself)", () => {
    const { container } = render(<PrivacyBanner text="Private" />);

    const banner = container.firstElementChild as HTMLElement;
    // The banner should not have a dismiss/close button
    // (close buttons are only in the modal, not on the banner)
    const bannerButtons = banner.querySelectorAll("button");
    for (const btn of bannerButtons) {
      // None of the banner-level buttons should be a "dismiss" or "close" for the banner
      const label =
        btn.getAttribute("aria-label") || btn.textContent || "";
      expect(label.toLowerCase()).not.toMatch(/dismiss|close|hide/);
    }
  });

  test("snapshot: PrivacyBanner renders expected structure", () => {
    const { container } = render(
      <PrivacyBanner
        text="This conversation is private to you."
        otherPartyName="Jordan"
      />
    );

    // Snapshot test to catch unintended visual regressions
    expect(container.firstElementChild).toMatchSnapshot();
  });
});

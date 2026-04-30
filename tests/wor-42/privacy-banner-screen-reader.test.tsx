/**
 * AC 3: Screen reader text: "Private conversation. Only you and the AI coach see this."
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe('AC 3: Screen reader text: "Private conversation. Only you and the AI coach see this."', () => {
  test("contains the required screen reader text", () => {
    render(<PrivacyBanner text="This is private" />);

    // The exact text must be present for screen readers, either as
    // visually hidden text or via an aria-label on the banner region.
    const srText = screen.getByText(
      "Private conversation. Only you and the AI coach see this."
    );
    expect(srText).toBeInTheDocument();
  });

  test("banner region has an appropriate ARIA role", () => {
    const { container } = render(<PrivacyBanner text="This is private" />);

    // The banner should use role="region" or role="status" or
    // role="banner" — an appropriate landmark role per DesignDoc §7
    const banner = container.firstElementChild as HTMLElement;
    const role = banner.getAttribute("role");
    expect(["region", "status", "banner"]).toContain(role);
  });
});

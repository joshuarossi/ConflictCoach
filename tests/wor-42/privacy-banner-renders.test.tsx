/**
 * AC 1: PrivacyBanner renders with a lock icon, --private-tint background, and configurable text
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe("AC 1: PrivacyBanner renders with a lock icon, --private-tint background, and configurable text", () => {
  test("renders the configurable text passed via prop", () => {
    render(<PrivacyBanner text="This conversation is private to you." />);
    expect(
      screen.getByText("This conversation is private to you."),
    ).toBeInTheDocument();
  });

  test("renders a lock icon (Lucide Lock)", () => {
    render(<PrivacyBanner text="Private" />);
    // Lucide Lock icon should be rendered as an SVG; the component should
    // give it an accessible label so it is findable by role.
    const lockIcon = screen.getByRole("button", { name: /lock/i });
    expect(lockIcon).toBeInTheDocument();
    // The icon should contain an SVG element
    const svg = lockIcon.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  test("applies --private-tint background color (#F0E9E0)", () => {
    const { container } = render(<PrivacyBanner text="Private" />);
    const banner = container.firstElementChild as HTMLElement;
    // The banner should use the --private-tint token, either as a CSS variable
    // or as a Tailwind utility class that resolves to #F0E9E0
    const style = window.getComputedStyle(banner);
    const hasTintClass =
      banner.className.includes("private-tint") ||
      banner.style.backgroundColor !== "";
    const hasCorrectBg =
      style.backgroundColor === "rgb(240, 233, 224)" ||
      style.backgroundColor === "#F0E9E0" ||
      hasTintClass;
    expect(hasCorrectBg).toBe(true);
  });
});

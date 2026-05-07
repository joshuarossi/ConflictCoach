/**
 * WOR-86: PrivacyBanner full-bleed layout with bottom border, not rounded card.
 * Tests all 6 acceptance criteria from the contract.
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe("WOR-86: PrivacyBanner full-bleed layout", () => {
  test("AC1: outer div uses full-bleed classes with no card treatment", () => {
    const { container } = render(<PrivacyBanner />);
    const banner = container.firstElementChild as HTMLElement;

    // Required classes per style-guide §08
    expect(banner.className).toContain("flex");
    expect(banner.className).toContain("items-start");
    expect(banner.className).toContain("gap-2.5");
    expect(banner.className).toContain("px-4");
    expect(banner.className).toContain("py-3");
    expect(banner.className).toContain("bg-private-tint");
    expect(banner.className).toContain("border-b");
    expect(banner.className).toContain("border-border-default");

    // Must NOT have card-style classes
    expect(banner.className).not.toContain("mx-4");
    expect(banner.className).not.toContain("rounded-md");
    expect(banner.className).not.toContain("mb-2");
    // No standalone "border" class (only border-b is allowed)
    expect(banner.className).not.toMatch(/\bborder\b(?!-)/);
  });

  test("AC2: lock icon is decorative (aria-hidden, not wrapped in button)", () => {
    const { container } = render(<PrivacyBanner />);

    // Lock icon must NOT be a button
    expect(
      screen.queryByRole("button", { name: /lock/i }),
    ).not.toBeInTheDocument();

    // Lock icon SVG should be aria-hidden
    const lockSvg = container.querySelector("svg.lucide-lock");
    expect(lockSvg).toBeInTheDocument();
    expect(lockSvg).toHaveAttribute("aria-hidden", "true");
  });

  test("AC3: content text uses correct typography tokens with bold prefix", () => {
    render(<PrivacyBanner />);

    // Bold prefix span
    const prefixSpan = screen.getByText(/Private to you\./).closest("span");
    expect(prefixSpan).toHaveClass("font-medium", "text-text-primary");

    // Text container has correct typography
    const textContainer = screen
      .getByText(/Only you and the AI coach/)
      .closest("p, div, span");
    expect(textContainer).toHaveClass(
      "text-meta",
      "text-text-secondary",
      "leading-snug",
    );
  });

  test("AC4: inline 'Learn more about privacy' link opens the modal", async () => {
    const user = userEvent.setup();
    render(<PrivacyBanner />);

    // The link trigger must exist
    const learnMoreLink = screen.getByRole("button", {
      name: /learn more about privacy/i,
    });
    expect(learnMoreLink).toBeInTheDocument();

    // Modal should not be visible initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Clicking the link opens the modal
    await user.click(learnMoreLink);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("AC5: privacy modal renders Privacy Boundaries content when triggered via link", async () => {
    const user = userEvent.setup();
    render(<PrivacyBanner />);

    await user.click(
      screen.getByRole("button", { name: /learn more about privacy/i }),
    );

    expect(screen.getByText("Privacy Boundaries")).toBeInTheDocument();
    expect(screen.getByRole("dialog").textContent).toMatch(/private to you/i);
  });

  test("AC6: no horizontal inset or rounded corners — full-bleed", () => {
    const { container } = render(<PrivacyBanner />);
    const banner = container.firstElementChild as HTMLElement;

    expect(banner.className).not.toMatch(/rounded-/);
    expect(banner.className).not.toMatch(/\bmx-/);
    expect(banner.className).not.toContain("mb-2");
  });
});

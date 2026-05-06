/**
 * WOR-81: PrivacyBanner styling — rounded corners, border, margin, focus ring
 *
 * These tests assert the visual styling classes required by the contract.
 * They are expected to FAIL (red state) until the implementation adds the
 * missing classes to src/components/PrivacyBanner.tsx.
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe("WOR-81: PrivacyBanner styling", () => {
  function renderBanner() {
    const { container } = render(
      <PrivacyBanner text="This conversation is private to you." />,
    );
    const banner = container.firstElementChild as HTMLElement;
    const lockButton = screen.getByRole("button", {
      name: /lock — view privacy details/i,
    });
    return { banner, lockButton };
  }

  test("AC1: outer container has rounded corners (rounded-md)", () => {
    const { banner } = renderBanner();
    expect(banner.className).toContain("rounded-md");
  });

  test("AC2: outer container has a visible border using a design-token color", () => {
    const { banner } = renderBanner();
    expect(banner.className).toContain("border");
    // Border color must use a design token, not a raw Tailwind color
    expect(banner.className).toMatch(/border-(border-default|accent)/);
  });

  test("AC3: outer container has margin so it is not a flush full-width strip", () => {
    const { banner } = renderBanner();
    expect(banner.className).toContain("mx-4");
    expect(banner.className).toContain("mb-2");
  });

  test("AC4: lock button focus ring uses design-token color (focus:ring-accent)", () => {
    const { lockButton } = renderBanner();
    expect(lockButton.className).toContain("focus:ring-accent");
  });

  test("AC5: no raw Tailwind color classes on banner or lock button", () => {
    const { banner, lockButton } = renderBanner();
    const rawTailwindColor =
      /\b(bg|text|border|ring)-(red|blue|green|gray|slate|zinc|neutral|stone|amber|yellow|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose|orange|white|black)-\d{2,3}\b/;
    expect(banner.className).not.toMatch(rawTailwindColor);
    expect(lockButton.className).not.toMatch(rawTailwindColor);
  });
});

/**
 * AC 4: PrivacyBanner accepts and renders the `text` and `otherPartyName`
 * props.
 *
 * History note: an earlier WOR-86 revision enshrined a regression where
 * both props were accepted but ignored, replaced by hardcoded copy per
 * style-guide §08. That regression broke personalization in
 * PrivateCoachingView (WOR-44) which depends on `otherPartyName` to
 * render "<name> will never see any of it." This file restores the
 * correct contract.
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe("AC 4: PrivacyBanner accepts and renders text and otherPartyName props", () => {
  test("renders without crashing when otherPartyName is passed", () => {
    const { container } = render(<PrivacyBanner otherPartyName="Jordan" />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  test("renders the supplied otherPartyName inline", () => {
    render(<PrivacyBanner otherPartyName="Alex" />);
    expect(
      screen.getByText(/Alex will never see any of it/i),
    ).toBeInTheDocument();
  });

  test("renders the supplied text prop as the lead headline", () => {
    render(<PrivacyBanner text="A custom privacy lead." />);
    expect(screen.getByText("A custom privacy lead.")).toBeInTheDocument();
  });

  test("falls back to default lead text when no text prop is supplied", () => {
    render(<PrivacyBanner />);
    expect(
      screen.getByText(/this conversation is private to you/i),
    ).toBeInTheDocument();
  });

  test("works without any props", () => {
    const { container } = render(<PrivacyBanner />);
    expect(container.firstElementChild).toBeInTheDocument();
  });
});

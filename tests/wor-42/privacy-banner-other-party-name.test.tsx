/**
 * AC 4: Component accepts otherPartyName prop (backward compat)
 * Updated for WOR-86: banner now renders hardcoded copy per style-guide §08.
 * The otherPartyName prop is accepted but no longer displayed inline.
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe("AC 4: Component accepts otherPartyName prop (backward compat)", () => {
  test("renders without crashing when otherPartyName is passed", () => {
    // Per WOR-86: the banner renders hardcoded copy. otherPartyName is accepted
    // for backward compat but not displayed inline.
    const { container } = render(<PrivacyBanner otherPartyName="Jordan" />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  test("renders hardcoded privacy copy regardless of props", () => {
    render(<PrivacyBanner otherPartyName="Alex" />);

    // The banner always renders the spec's hardcoded text
    expect(screen.getByText(/Private to you\./)).toBeInTheDocument();
    expect(
      screen.getByText(/Only you and the AI coach/),
    ).toBeInTheDocument();
  });

  test("works without any props", () => {
    render(<PrivacyBanner />);

    // Should render the hardcoded text without crashing
    expect(screen.getByText(/Private to you\./)).toBeInTheDocument();
  });
});

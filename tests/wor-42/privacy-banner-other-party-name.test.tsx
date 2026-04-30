/**
 * AC 4: Component accepts otherPartyName prop for personalized copy
 *       (e.g., "Jordan can't see this")
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe('AC 4: Component accepts otherPartyName prop for personalized copy (e.g., "Jordan can\'t see this")', () => {
  test("renders personalized copy with otherPartyName", () => {
    render(
      <PrivacyBanner
        text="This is private"
        otherPartyName="Jordan"
      />
    );

    // When otherPartyName is provided, the banner should include
    // personalized copy mentioning the other party by name
    expect(screen.getByText(/Jordan/)).toBeInTheDocument();
    // Should indicate that Jordan can't see this content
    expect(
      screen.getByText(/Jordan.*can't see/i) ||
        screen.getByText(/Jordan.*will never see/i)
    ).toBeTruthy();
  });

  test("renders different names correctly", () => {
    render(
      <PrivacyBanner
        text="This is private"
        otherPartyName="Alex"
      />
    );

    expect(screen.getByText(/Alex/)).toBeInTheDocument();
  });

  test("works without otherPartyName (generic copy)", () => {
    render(<PrivacyBanner text="This conversation is private to you." />);

    // Should still render the text without crashing
    expect(
      screen.getByText("This conversation is private to you.")
    ).toBeInTheDocument();
  });
});

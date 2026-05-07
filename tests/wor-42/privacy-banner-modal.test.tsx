/**
 * AC 2: "Learn more about privacy" link opens a modal explaining privacy boundaries
 * Updated for WOR-86: modal trigger is now the inline link, not the lock icon.
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe("AC 2: 'Learn more about privacy' link opens a modal explaining privacy boundaries", () => {
  test("clicking the 'Learn more about privacy' link opens a dialog/modal", async () => {
    const user = userEvent.setup();
    render(<PrivacyBanner />);

    // Modal should not be visible initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click the inline link trigger
    const learnMoreLink = screen.getByRole("button", {
      name: /learn more about privacy/i,
    });
    await user.click(learnMoreLink);

    // Modal should now be visible
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  test("modal contains text explaining privacy boundaries", async () => {
    const user = userEvent.setup();
    render(<PrivacyBanner />);

    const learnMoreLink = screen.getByRole("button", {
      name: /learn more about privacy/i,
    });
    await user.click(learnMoreLink);

    // The modal should explain what data is private and why
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toMatch(/private|privacy|visible|see/i);
  });

  test("modal can be closed", async () => {
    const user = userEvent.setup();
    render(<PrivacyBanner />);

    const learnMoreLink = screen.getByRole("button", {
      name: /learn more about privacy/i,
    });
    await user.click(learnMoreLink);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Close the modal (by clicking a close button or pressing Escape)
    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    // Modal should be gone
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

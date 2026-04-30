/**
 * AC 2: Lock icon click opens a modal explaining privacy boundaries
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { PrivacyBanner } from "@/components/PrivacyBanner";

describe("AC 2: Lock icon click opens a modal explaining privacy boundaries", () => {
  test("clicking the lock icon opens a dialog/modal", async () => {
    const user = userEvent.setup();
    render(<PrivacyBanner text="This is private" />);

    // Modal should not be visible initially
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click the lock icon button
    const lockButton = screen.getByRole("button", { name: /lock/i });
    await user.click(lockButton);

    // Modal should now be visible
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  test("modal contains text explaining privacy boundaries", async () => {
    const user = userEvent.setup();
    render(<PrivacyBanner text="This is private" />);

    const lockButton = screen.getByRole("button", { name: /lock/i });
    await user.click(lockButton);

    // The modal should explain what data is private and why
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toMatch(/private|privacy|visible|see/i);
  });

  test("modal can be closed", async () => {
    const user = userEvent.setup();
    render(<PrivacyBanner text="This is private" />);

    const lockButton = screen.getByRole("button", { name: /lock/i });
    await user.click(lockButton);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Close the modal (by clicking a close button or pressing Escape)
    const closeButton = screen.getByRole("button", { name: /close/i });
    await user.click(closeButton);

    // Modal should be gone
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

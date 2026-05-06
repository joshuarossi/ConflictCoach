/**
 * WOR-53: Confirmation banner unit tests
 *
 * Covers:
 * - AC: Confirmation banner renders above the chat input for the other party
 *       when closure is proposed
 * - AC: Banner shows the proposer's summary text + Confirm and
 *       "Reject and keep talking" buttons
 * - AC: Confirm calls confirmClosure; case transitions to CLOSED_RESOLVED
 * - AC: Reject clears the proposal; both parties continue chatting
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClosureConfirmationBanner } from "../../src/components/ClosureConfirmationBanner";

describe("WOR-53: ClosureConfirmationBanner", () => {
  const defaultProps = {
    proposerName: "Alex",
    summaryText: "We agreed to split the cost 50/50 and meet monthly.",
    onConfirm: vi.fn(),
    onReject: vi.fn(),
  };

  // ---------------------------------------------------------------------------
  // AC: Banner renders when closure is proposed
  // ---------------------------------------------------------------------------
  describe("AC: Banner renders for other party", () => {
    test("renders the banner with proposer name", () => {
      render(<ClosureConfirmationBanner {...defaultProps} />);

      expect(screen.getByText(/alex/i)).toBeInTheDocument();
    });

    test("renders the summary text from the proposer", () => {
      render(<ClosureConfirmationBanner {...defaultProps} />);

      expect(
        screen.getByText(
          "We agreed to split the cost 50/50 and meet monthly.",
        ),
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // AC: Banner shows Confirm and Reject buttons
  // ---------------------------------------------------------------------------
  describe("AC: Confirm and Reject buttons", () => {
    test("renders a Confirm button", () => {
      render(<ClosureConfirmationBanner {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /confirm/i }),
      ).toBeInTheDocument();
    });

    test("renders a Reject and keep talking button", () => {
      render(<ClosureConfirmationBanner {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /reject and keep talking/i }),
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // AC: Confirm calls confirmClosure
  // ---------------------------------------------------------------------------
  describe("AC: Confirm calls confirmClosure", () => {
    test("calls onConfirm when Confirm button is clicked", async () => {
      const onConfirm = vi.fn();
      render(
        <ClosureConfirmationBanner {...defaultProps} onConfirm={onConfirm} />,
      );

      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await userEvent.click(confirmButton);

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // AC: Reject clears the proposal
  // ---------------------------------------------------------------------------
  describe("AC: Reject clears the proposal", () => {
    test("calls onReject when Reject button is clicked", async () => {
      const onReject = vi.fn();
      render(
        <ClosureConfirmationBanner {...defaultProps} onReject={onReject} />,
      );

      const rejectButton = screen.getByRole("button", {
        name: /reject and keep talking/i,
      });
      await userEvent.click(rejectButton);

      expect(onReject).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // AC: Consequence messaging in the banner
  // ---------------------------------------------------------------------------
  describe("AC: Consequence messaging in banner", () => {
    test("banner describes consequence: closes the case for both", () => {
      render(<ClosureConfirmationBanner {...defaultProps} />);

      expect(
        screen.getByText(/closes the case for both of you/i),
      ).toBeInTheDocument();
    });
  });
});

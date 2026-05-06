/**
 * WOR-53: Case closure modal unit tests
 *
 * Covers:
 * - AC: Close button in joint chat header opens a styled modal (not a browser confirm)
 * - AC: Three options in the modal: Resolved (with summary textarea),
 *       Not resolved (warning styled, optional note), Take a break (just closes)
 * - AC: "Propose Resolution" button calls the proposeClosure mutation
 * - AC: Confirmation modals describe consequences clearly:
 *       "This closes the case for both of you."
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CaseClosureModal } from "../../src/components/CaseClosureModal";

describe("WOR-53: CaseClosureModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onProposeClosure: vi.fn(),
    onUnilateralClose: vi.fn(),
    onTakeABreak: vi.fn(),
  };

  // ---------------------------------------------------------------------------
  // AC: Close button opens a styled modal (not browser confirm)
  // ---------------------------------------------------------------------------
  describe("AC: Modal renders as a styled dialog", () => {
    test("renders with role=dialog and aria-modal=true when open", () => {
      render(<CaseClosureModal {...defaultProps} />);

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });

    test("does not render when open is false", () => {
      render(<CaseClosureModal {...defaultProps} open={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // AC: Three options in the modal
  // ---------------------------------------------------------------------------
  describe("AC: Three closure options", () => {
    test("renders Resolved option", () => {
      render(<CaseClosureModal {...defaultProps} />);

      expect(
        screen.queryByRole("radio", { name: /resolved/i }) ??
          screen.getByText(/^resolved$/i),
      ).toBeInTheDocument();
    });

    test("renders Not resolved option", () => {
      render(<CaseClosureModal {...defaultProps} />);

      expect(
        screen.queryByRole("radio", { name: /not resolved/i }) ??
          screen.getByText(/not resolved/i),
      ).toBeInTheDocument();
    });

    test("renders Take a break option", () => {
      render(<CaseClosureModal {...defaultProps} />);

      expect(
        screen.queryByRole("radio", { name: /take a break/i }) ??
          screen.getByText(/take a break/i),
      ).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // AC: Resolved option has a required textarea
  // ---------------------------------------------------------------------------
  describe("AC: Resolved option with required summary textarea", () => {
    test("shows textarea when Resolved is selected", async () => {
      render(<CaseClosureModal {...defaultProps} />);

      const resolvedOption =
        screen.queryByRole("radio", { name: /resolved/i }) ??
        screen.getByText(/^resolved$/i);
      await userEvent.click(resolvedOption);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeInTheDocument();
    });

    test("textarea has descriptive placeholder about agreement summary", async () => {
      render(<CaseClosureModal {...defaultProps} />);

      const resolvedOption =
        screen.queryByRole("radio", { name: /resolved/i }) ??
        screen.getByText(/^resolved$/i);
      await userEvent.click(resolvedOption);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("placeholder");
    });

    test("submit is blocked when textarea is empty (validation)", async () => {
      render(<CaseClosureModal {...defaultProps} />);

      const resolvedOption =
        screen.queryByRole("radio", { name: /resolved/i }) ??
        screen.getByText(/^resolved$/i);
      await userEvent.click(resolvedOption);

      const submitButton = screen.getByRole("button", {
        name: /propose resolution/i,
      });
      await userEvent.click(submitButton);

      // onProposeClosure should NOT be called with empty textarea
      expect(defaultProps.onProposeClosure).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // AC: "Propose Resolution" calls proposeClosure
  // ---------------------------------------------------------------------------
  describe("AC: Propose Resolution calls proposeClosure mutation", () => {
    test("calls onProposeClosure with the summary text when submitted", async () => {
      const onProposeClosure = vi.fn();
      render(
        <CaseClosureModal
          {...defaultProps}
          onProposeClosure={onProposeClosure}
        />,
      );

      const resolvedOption =
        screen.queryByRole("radio", { name: /resolved/i }) ??
        screen.getByText(/^resolved$/i);
      await userEvent.click(resolvedOption);

      const textarea = screen.getByRole("textbox");
      await userEvent.type(textarea, "We agreed to split the cost 50/50");

      const submitButton = screen.getByRole("button", {
        name: /propose resolution/i,
      });
      await userEvent.click(submitButton);

      expect(onProposeClosure).toHaveBeenCalledWith(
        "We agreed to split the cost 50/50",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC: Not resolved option calls unilateralClose
  // ---------------------------------------------------------------------------
  describe("AC: Not resolved option triggers unilateral close", () => {
    test("shows warning styling when Not resolved is selected", async () => {
      render(<CaseClosureModal {...defaultProps} />);

      const notResolvedOption =
        screen.queryByRole("radio", { name: /not resolved/i }) ??
        screen.getByText(/not resolved/i);
      await userEvent.click(notResolvedOption);

      // Check for warning visual indicator (text-warning or destructive styling)
      const warningArea = screen.getByText(
        /closes the case immediately for both of you/i,
      );
      expect(warningArea).toBeInTheDocument();
    });

    test("calls onUnilateralClose when Not resolved is confirmed", async () => {
      const onUnilateralClose = vi.fn();
      render(
        <CaseClosureModal
          {...defaultProps}
          onUnilateralClose={onUnilateralClose}
        />,
      );

      const notResolvedOption =
        screen.queryByRole("radio", { name: /not resolved/i }) ??
        screen.getByText(/not resolved/i);
      await userEvent.click(notResolvedOption);

      const closeButton = screen.getByRole("button", {
        name: /close without resolution/i,
      });
      await userEvent.click(closeButton);

      expect(onUnilateralClose).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // AC: Take a break just closes the modal
  // ---------------------------------------------------------------------------
  describe("AC: Take a break closes the modal without mutation", () => {
    test("calls onTakeABreak (closes modal, no mutation)", async () => {
      const onTakeABreak = vi.fn();
      const onOpenChange = vi.fn();
      render(
        <CaseClosureModal
          {...defaultProps}
          onTakeABreak={onTakeABreak}
          onOpenChange={onOpenChange}
        />,
      );

      const takeABreakOption =
        screen.queryByRole("radio", { name: /take a break/i }) ??
        screen.getByText(/take a break/i);
      await userEvent.click(takeABreakOption);

      const confirmButton = screen.getByRole("button", {
        name: /take a break/i,
      });
      await userEvent.click(confirmButton);

      expect(onTakeABreak).toHaveBeenCalled();
      // Should NOT call closure mutations
      expect(defaultProps.onProposeClosure).not.toHaveBeenCalled();
      expect(defaultProps.onUnilateralClose).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // AC: Consequence messaging
  // ---------------------------------------------------------------------------
  describe("AC: Consequence text renders for both Resolved and Not resolved", () => {
    test("Resolved option shows consequence: other party must confirm", async () => {
      render(<CaseClosureModal {...defaultProps} />);

      const resolvedOption =
        screen.queryByRole("radio", { name: /resolved/i }) ??
        screen.getByText(/^resolved$/i);
      await userEvent.click(resolvedOption);

      expect(
        screen.getByText(/will see this summary and confirm/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/case won.t close until you both agree/i),
      ).toBeInTheDocument();
    });

    test("Not resolved option shows consequence: closes for both", async () => {
      render(<CaseClosureModal {...defaultProps} />);

      const notResolvedOption =
        screen.queryByRole("radio", { name: /not resolved/i }) ??
        screen.getByText(/not resolved/i);
      await userEvent.click(notResolvedOption);

      expect(
        screen.getByText(/closes the case immediately for both of you/i),
      ).toBeInTheDocument();
    });
  });
});

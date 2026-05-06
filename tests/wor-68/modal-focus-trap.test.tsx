import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CaseClosureModal } from "@/components/CaseClosureModal";
import { PrivacyBanner } from "@/components/PrivacyBanner";
import { PrivateCoachingView } from "@/components/PrivateCoachingView";

/**
 * WOR-68 AC: "All modals trap focus and restore on close"
 *
 * Invariants:
 * - All modal components (Dialog, AlertDialog) trap focus inside the modal
 *   and restore focus to the trigger element on close — provided by Radix primitives
 * - Radix DialogPrimitive.Content natively provides focus trapping and restore
 *
 * Note: DraftCoachPanel is NOT a modal (role="complementary") and does NOT
 * trap focus. It uses Escape to close instead.
 */

// Mock Convex hooks for PrivacyBanner (which uses Dialog)
vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => null),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: vi.fn(() => ({ signIn: vi.fn(), signOut: vi.fn() })),
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    privateCoaching: {
      markComplete: "privateCoaching:markComplete",
    },
  },
}));

vi.mock("react-router-dom", () => ({
  useParams: vi.fn(() => ({})),
  useLocation: vi.fn(() => ({ pathname: "/cases/123/private" })),
  useNavigate: vi.fn(() => vi.fn()),
  useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
}));

vi.mock("@/hooks/useActingPartyUserId", () => ({
  useActingPartyUserId: vi.fn(() => "user-123"),
}));

vi.mock("@/hooks/useNetworkErrorToast", () => ({
  useNetworkErrorToast: vi.fn(() => vi.fn()),
}));

describe("WOR-68: Modal focus trap — CaseClosureModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    otherPartyName: "Jordan",
    onProposeClosure: vi.fn(),
    onUnilateralClose: vi.fn(),
    onTakeABreak: vi.fn(),
  };

  it("when open, focus is inside the modal", () => {
    render(<CaseClosureModal {...defaultProps} />);

    // Radix Dialog moves focus inside the content on open
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("the modal has aria-modal='true'", () => {
    render(<CaseClosureModal {...defaultProps} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("Tab key cycles focus within the modal (focus trap)", async () => {
    const user = userEvent.setup();
    render(<CaseClosureModal {...defaultProps} />);

    const dialog = screen.getByRole("dialog");

    // Tab through all focusable elements inside the modal
    // After enough tabs, focus should still be inside the dialog (trapped)
    for (let i = 0; i < 15; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("focus restores to trigger element on close", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    // Render the trigger button first, focus it (simulating the user
    // clicking it to open the modal), THEN render the modal as open.
    // CaseClosureModal's onOpenAutoFocus captures document.activeElement
    // at open time; without prior focus the captured value would be <body>
    // and there'd be nothing to restore to.
    const { rerender } = render(
      <div>
        <button data-testid="trigger">Open Modal</button>
        <CaseClosureModal
          {...defaultProps}
          open={false}
          onOpenChange={onOpenChange}
        />
      </div>,
    );

    const trigger = screen.getByTestId("trigger");
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    // Now open the modal. CaseClosureModal is a controlled Dialog (open
    // prop is owned by the parent). The modal will capture the trigger
    // via onOpenAutoFocus.
    rerender(
      <div>
        <button data-testid="trigger">Open Modal</button>
        <CaseClosureModal {...defaultProps} onOpenChange={onOpenChange} />
      </div>,
    );

    // Focus should now be inside the dialog
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Close the modal by pressing Escape
    await user.keyboard("{Escape}");

    // Simulate parent reacting to onOpenChange(false) by rerendering closed.
    rerender(
      <div>
        <button data-testid="trigger">Open Modal</button>
        <CaseClosureModal
          {...defaultProps}
          open={false}
          onOpenChange={onOpenChange}
        />
      </div>,
    );

    // After close, focus should be restored to the trigger element.
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId("trigger"));
    });
  });
});

describe("WOR-68: Modal focus trap — AlertDialog (mark-complete confirmation)", () => {
  const privateCoachingProps = {
    otherPartyName: "Jordan",
    messages: [] as Array<{
      _id: string;
      role: "USER" | "AI";
      content: string;
      status: "STREAMING" | "COMPLETE" | "ERROR";
      createdAt: number;
    }>,
    isCompleted: false,
    isStreaming: false,
    onSendMessage: vi.fn(),
    onMarkComplete: vi.fn(),
  };

  it("clicking mark-complete opens an AlertDialog with aria-modal", async () => {
    const user = userEvent.setup();
    render(<PrivateCoachingView {...privateCoachingProps} />);

    // Click the mark-complete trigger button
    const triggerButton = screen.getByText("Mark private coaching complete");
    await user.click(triggerButton);

    // AlertDialog should be open
    const alertDialog = screen.getByRole("alertdialog");
    expect(alertDialog).toBeTruthy();
    expect(alertDialog.getAttribute("aria-modal")).toBe("true");
  });

  it("AlertDialog traps focus inside when open", async () => {
    const user = userEvent.setup();
    render(<PrivateCoachingView {...privateCoachingProps} />);

    // Open the AlertDialog
    const triggerButton = screen.getByText("Mark private coaching complete");
    await user.click(triggerButton);

    const alertDialog = screen.getByRole("alertdialog");
    expect(alertDialog.contains(document.activeElement)).toBe(true);

    // Tab through elements — focus should remain trapped inside
    for (let i = 0; i < 10; i++) {
      await user.tab();
      expect(alertDialog.contains(document.activeElement)).toBe(true);
    }
  });
});

describe("WOR-68: Modal focus trap — PrivacyBanner dialog", () => {
  it("PrivacyBanner dialog traps focus when open", async () => {
    const user = userEvent.setup();
    render(<PrivacyBanner text="This conversation is private to you." />);

    // Open the privacy dialog by clicking the lock button
    const lockButton = screen.getByLabelText(/lock/i);
    await user.click(lockButton);

    // Dialog should be open with focus trapped inside
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeTruthy();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});

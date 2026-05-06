/**
 * WOR-44 AC 7: After marking complete, view becomes read-only with a status
 * message.
 *
 * PrivateCoachingView does not exist yet — import will fail (correct red state).
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrivateCoachingView } from "@/components/PrivateCoachingView";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

const pastMessages = [
  {
    _id: "privateMessages:msg_1" as any,
    caseId: "cases:test_case_001" as any,
    userId: "users:test_user_a" as any,
    role: "USER" as const,
    content: "Thanks for the coaching.",
    status: "COMPLETE" as const,
    createdAt: 1000,
  },
  {
    _id: "privateMessages:msg_2" as any,
    caseId: "cases:test_case_001" as any,
    userId: "users:test_user_a" as any,
    role: "AI" as const,
    content: "You're welcome. Good luck!",
    status: "COMPLETE" as const,
    createdAt: 1001,
  },
];

function renderCompletedView() {
  return render(
    <MemoryRouter initialEntries={["/cases/test-case/private"]}>
      <PrivateCoachingView
        caseId={"cases:test_case_001" as any}
        otherPartyName="Jordan"
        messages={pastMessages}
        isCompleted={true}
        isStreaming={false}
        onSendMessage={vi.fn()}
        onMarkComplete={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("AC 7: After marking complete, view becomes read-only with a status message", () => {
  test("After marking complete, view becomes read-only with a status message", () => {
    renderCompletedView();

    // A status message should indicate coaching is complete
    const statusMessage = screen.getByText(/private coaching complete/i);
    expect(statusMessage).toBeInTheDocument();
  });

  test("Message input is not rendered or is disabled when coaching is complete", () => {
    renderCompletedView();

    // The text input for sending new messages should be absent or disabled
    const input = screen.queryByRole("textbox");
    if (input) {
      expect(input).toBeDisabled();
    } else {
      // Input not rendered at all — also valid
      expect(input).toBeNull();
    }
  });

  test("Send button is not rendered when coaching is complete", () => {
    renderCompletedView();

    const sendButton = screen.queryByRole("button", { name: /send/i });
    if (sendButton) {
      expect(sendButton).toBeDisabled();
    } else {
      expect(sendButton).toBeNull();
    }
  });

  test("Past messages are still visible in read-only mode", () => {
    renderCompletedView();

    // Messages from the coaching session should still be visible
    expect(screen.getByText("Thanks for the coaching.")).toBeInTheDocument();
    expect(screen.getByText("You're welcome. Good luck!")).toBeInTheDocument();
  });

  test("Mark complete button is not shown in read-only mode", () => {
    renderCompletedView();

    const markCompleteButton = screen.queryByRole("button", {
      name: /mark private coaching complete/i,
    });
    expect(markCompleteButton).toBeNull();
  });
});

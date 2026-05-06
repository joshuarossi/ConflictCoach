/**
 * WOR-44 AC 6: Mark Complete opens confirmation dialog showing message count:
 * "You've had {N} messages with the Coach. Ready to move on?"
 *
 * PrivateCoachingView does not exist yet — import will fail (correct red state).
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PrivateCoachingView } from "@/components/PrivateCoachingView";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

const mockMessages = [
  {
    _id: "privateMessages:msg_1" as any,
    caseId: "cases:test_case_001" as any,
    userId: "users:test_user_a" as any,
    role: "USER" as const,
    content: "I feel frustrated.",
    status: "COMPLETE" as const,
    createdAt: 1000,
  },
  {
    _id: "privateMessages:msg_2" as any,
    caseId: "cases:test_case_001" as any,
    userId: "users:test_user_a" as any,
    role: "AI" as const,
    content: "Tell me more.",
    status: "COMPLETE" as const,
    createdAt: 1001,
  },
  {
    _id: "privateMessages:msg_3" as any,
    caseId: "cases:test_case_001" as any,
    userId: "users:test_user_a" as any,
    role: "USER" as const,
    content: "They override my decisions.",
    status: "COMPLETE" as const,
    createdAt: 1002,
  },
  {
    _id: "privateMessages:msg_4" as any,
    caseId: "cases:test_case_001" as any,
    userId: "users:test_user_a" as any,
    role: "AI" as const,
    content: "I understand. Let's explore that.",
    status: "COMPLETE" as const,
    createdAt: 1003,
  },
];

function renderView(messages = mockMessages) {
  const onMarkComplete = vi.fn();
  const result = render(
    <MemoryRouter initialEntries={["/cases/test-case/private"]}>
      <PrivateCoachingView
        caseId={"cases:test_case_001" as any}
        otherPartyName="Jordan"
        messages={messages}
        isCompleted={false}
        isStreaming={false}
        onSendMessage={vi.fn()}
        onMarkComplete={onMarkComplete}
      />
    </MemoryRouter>,
  );
  return { ...result, onMarkComplete };
}

describe("AC 6: Mark Complete opens confirmation dialog showing message count", () => {
  test('Mark Complete opens confirmation dialog showing message count: "You\'ve had {N} messages with the Coach. Ready to move on?"', async () => {
    const user = userEvent.setup();
    renderView(mockMessages);

    // Click the Mark Complete button
    const markCompleteButton = screen.getByRole("button", {
      name: /mark private coaching complete/i,
    });
    await user.click(markCompleteButton);

    // A confirmation dialog should appear
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    // It should display the message count (4 messages in our fixture)
    expect(
      screen.getByText(/you've had 4 messages/i) ||
        screen.getByText(/4 messages with the Coach/i),
    ).toBeInTheDocument();

    // It should ask if ready to move on
    expect(screen.getByText(/ready to move on/i)).toBeInTheDocument();
  });

  test("Confirmation dialog has a confirm button that calls onMarkComplete", async () => {
    const user = userEvent.setup();
    const { onMarkComplete } = renderView();

    const markCompleteButton = screen.getByRole("button", {
      name: /mark private coaching complete/i,
    });
    await user.click(markCompleteButton);

    // Find and click the confirm button in the dialog
    const confirmButton = screen.getByRole("button", {
      name: /confirm|yes|ready|continue/i,
    });
    await user.click(confirmButton);

    expect(onMarkComplete).toHaveBeenCalledTimes(1);
  });

  test("Confirmation dialog can be cancelled without calling onMarkComplete", async () => {
    const user = userEvent.setup();
    const { onMarkComplete } = renderView();

    const markCompleteButton = screen.getByRole("button", {
      name: /mark private coaching complete/i,
    });
    await user.click(markCompleteButton);

    // Find and click the cancel button
    const cancelButton = screen.getByRole("button", {
      name: /cancel|no|back|not yet/i,
    });
    await user.click(cancelButton);

    expect(onMarkComplete).not.toHaveBeenCalled();
  });
});

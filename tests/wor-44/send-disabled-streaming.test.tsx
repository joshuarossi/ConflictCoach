/**
 * WOR-44 AC 8: Input is enabled while AI is responding (user can pre-type)
 * but Send button is disabled during streaming.
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

const streamingMessage = {
  _id: "privateMessages:msg_streaming" as any,
  caseId: "cases:test_case_001" as any,
  userId: "users:test_user_a" as any,
  role: "AI" as const,
  content: "Let me think about",
  status: "STREAMING" as const,
  createdAt: 1000,
};

function renderView(isStreaming: boolean) {
  return render(
    <MemoryRouter initialEntries={["/cases/test-case/private"]}>
      <PrivateCoachingView
        caseId={"cases:test_case_001" as any}
        otherPartyName="Jordan"
        messages={isStreaming ? [streamingMessage] : []}
        isCompleted={false}
        isStreaming={isStreaming}
        onSendMessage={vi.fn()}
        onMarkComplete={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("AC 8: Input is enabled while AI is responding but Send button is disabled during streaming", () => {
  test("Input is enabled while AI is responding (user can pre-type) but Send button is disabled during streaming", async () => {
    renderView(true);

    // The text input should be enabled so the user can pre-type
    const input = screen.getByRole("textbox");
    expect(input).not.toBeDisabled();

    // User can type into the input
    const user = userEvent.setup();
    await user.type(input, "I want to add that...");
    expect(input).toHaveValue("I want to add that...");

    // But the Send button should be disabled during streaming
    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  test("Send button is enabled when NOT streaming", () => {
    renderView(false);

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).not.toBeDisabled();
  });

  test("Text input is enabled when NOT streaming", () => {
    renderView(false);

    const input = screen.getByRole("textbox");
    expect(input).not.toBeDisabled();
  });
});

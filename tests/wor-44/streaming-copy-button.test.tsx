/**
 * WOR-44 AC 4: Streaming messages show blinking cursor; copy button appears
 * only after message status is COMPLETE.
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

const streamingMessage = {
  _id: "privateMessages:msg_streaming" as any,
  caseId: "cases:test_case_001" as any,
  userId: "users:test_user_a" as any,
  role: "AI" as const,
  content: "I understand your frust",
  status: "STREAMING" as const,
  createdAt: 1000,
};

const completeMessage = {
  _id: "privateMessages:msg_complete" as any,
  caseId: "cases:test_case_001" as any,
  userId: "users:test_user_a" as any,
  role: "AI" as const,
  content: "I understand your frustration. Let's work through this together.",
  status: "COMPLETE" as const,
  createdAt: 1000,
};

function renderView(messages: any[], isStreaming = false) {
  return render(
    <MemoryRouter initialEntries={["/cases/test-case/private"]}>
      <PrivateCoachingView
        caseId={"cases:test_case_001" as any}
        otherPartyName="Jordan"
        messages={messages}
        isCompleted={false}
        isStreaming={isStreaming}
        onSendMessage={vi.fn()}
        onMarkComplete={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("AC 4: Streaming messages show blinking cursor; copy button appears only after message status is COMPLETE", () => {
  test("Streaming message shows a blinking cursor indicator", () => {
    const { container } = renderView([streamingMessage], true);

    // Look for a blinking cursor element (CSS animation, pulsing element, etc.)
    const cursor = container.querySelector(
      '[data-testid="streaming-cursor"], [class*="blink"], [class*="cursor"], [class*="animate-pulse"]',
    );
    expect(cursor).not.toBeNull();
  });

  test("Copy button is NOT shown while message status is STREAMING", () => {
    renderView([streamingMessage], true);

    const copyButton = screen.queryByRole("button", { name: /copy/i });
    expect(copyButton).toBeNull();
  });

  test("Copy button IS shown after message status is COMPLETE", () => {
    renderView([completeMessage], false);

    const copyButton = screen.getByRole("button", { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
  });
});

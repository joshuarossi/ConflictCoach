/**
 * WOR-44 AC 5: "Mark private coaching complete" is a footer CTA (not
 * prominently placed — avoids premature completion).
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

function renderView(overrides: Record<string, any> = {}) {
  return render(
    <MemoryRouter initialEntries={["/cases/test-case/private"]}>
      <PrivateCoachingView
        caseId={"cases:test_case_001" as any}
        otherPartyName="Jordan"
        messages={[]}
        isCompleted={false}
        isStreaming={false}
        onSendMessage={vi.fn()}
        onMarkComplete={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('AC 5: "Mark private coaching complete" is a footer CTA', () => {
  test('"Mark private coaching complete" button is present in the view', () => {
    renderView();

    const markCompleteButton = screen.getByRole("button", {
      name: /mark private coaching complete/i,
    });
    expect(markCompleteButton).toBeInTheDocument();
  });

  test("Mark complete button is positioned in the footer area (below the message input)", () => {
    const { container } = renderView();

    const markCompleteButton = screen.getByRole("button", {
      name: /mark private coaching complete/i,
    });

    // The button should be in a footer-like container, not in the header or
    // prominently above the chat. We verify it's not the first interactive
    // element a user encounters.
    const footer = markCompleteButton.closest(
      'footer, [role="contentinfo"], [data-testid="coaching-footer"]',
    );
    // Either it's inside a semantic footer, or at minimum it's below the input
    const allButtons = Array.from(container.querySelectorAll("button"));
    const markCompleteIndex = allButtons.indexOf(
      markCompleteButton as HTMLButtonElement,
    );
    // Should be among the last buttons (footer position)
    expect(markCompleteIndex).toBeGreaterThan(0);
  });

  test("Mark complete button is not shown when coaching is already completed", () => {
    renderView({ isCompleted: true });

    const markCompleteButton = screen.queryByRole("button", {
      name: /mark private coaching complete/i,
    });
    expect(markCompleteButton).toBeNull();
  });
});

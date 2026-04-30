/**
 * WOR-44 AC 1: Privacy banner is persistent at top: "This conversation is
 * private to you. Jordan will never see any of it." (uses other party's
 * display name)
 *
 * The component under test (PrivateCoachingView) does not exist yet.
 * The import will fail until the implementation is written — correct red state.
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PrivateCoachingView } from "@/components/PrivateCoachingView";

// Mock Convex hooks — we don't run against a real backend in unit tests
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
}));

function renderView(props: { otherPartyName?: string } = {}) {
  const { otherPartyName = "Jordan" } = props;
  return render(
    <MemoryRouter initialEntries={["/cases/test-case/private"]}>
      <PrivateCoachingView
        caseId={"cases:test_case_001" as any}
        otherPartyName={otherPartyName}
        messages={[]}
        isCompleted={false}
        isStreaming={false}
        onSendMessage={vi.fn()}
        onMarkComplete={vi.fn()}
      />
    </MemoryRouter>,
  );
}

describe("AC 1: Privacy banner is persistent at top with other party's display name", () => {
  test('Privacy banner is persistent at top: "This conversation is private to you. Jordan will never see any of it."', () => {
    renderView({ otherPartyName: "Jordan" });

    // The banner must contain text that names the other party
    const bannerText = screen.getByText(/Jordan will never see any of it/i);
    expect(bannerText).toBeInTheDocument();
  });

  test("Privacy banner includes the exact other party name when it differs", () => {
    renderView({ otherPartyName: "Alex" });

    const bannerText = screen.getByText(/Alex will never see any of it/i);
    expect(bannerText).toBeInTheDocument();
  });

  test("Privacy banner states the conversation is private to the user", () => {
    renderView();

    const privateText = screen.getByText(
      /this conversation is private to you/i,
    );
    expect(privateText).toBeInTheDocument();
  });

  test("Privacy banner is rendered as a persistent region at the top of the view", () => {
    const { container } = renderView();

    // The banner should be among the first children of the view,
    // identifiable by role='region' with privacy-related aria-label
    const region = container.querySelector(
      '[role="region"][aria-label*="rivacy"], [role="banner"]',
    );
    expect(region).not.toBeNull();
  });
});

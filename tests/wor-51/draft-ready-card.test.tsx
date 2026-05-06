/**
 * WOR-51: DraftReadyCard component tests
 *
 * AC5: When finalDraft is set, DraftReadyCard renders the draft in a
 *      highlighted card.
 * AC6: DraftReadyCard has 4 actions: Send this message (primary),
 *      Edit before sending, Keep refining with Coach, Discard.
 *
 * These tests will FAIL until DraftReadyCard is implemented — correct red state.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DraftReadyCard } from "@/components/DraftReadyCard";

const defaultProps = {
  draftText:
    "I appreciate the effort you've put into this project. I'd like to discuss the timeline concerns I have.",
  onSend: vi.fn(),
  onEdit: vi.fn(),
  onKeepRefining: vi.fn(),
  onDiscard: vi.fn(),
};

describe("AC5: DraftReadyCard renders when finalDraft is set", () => {
  it("renders the draft text in a highlighted card", () => {
    render(<DraftReadyCard {...defaultProps} />);

    // The draft text should be visible
    expect(
      screen.getByText(defaultProps.draftText),
    ).toBeInTheDocument();
  });

  it("visually highlights the card (distinct styling from regular messages)", () => {
    const { container } = render(<DraftReadyCard {...defaultProps} />);

    // The card container should have a highlight-related class (border, accent
    // background, or shadow) that distinguishes it from regular messages.
    const card = container.firstElementChild as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.className).toMatch(
      /border|bg-.*accent|bg-.*highlight|bg-.*warning|bg-.*primary|shadow/,
    );
  });
});

describe("AC6: DraftReadyCard has 4 actions", () => {
  it("renders 'Send this message' button (primary action)", () => {
    render(<DraftReadyCard {...defaultProps} />);

    const sendButton = screen.getByRole("button", {
      name: /send this message/i,
    });
    expect(sendButton).toBeInTheDocument();
  });

  it("renders 'Edit before sending' button", () => {
    render(<DraftReadyCard {...defaultProps} />);

    const editButton = screen.getByRole("button", {
      name: /edit before sending/i,
    });
    expect(editButton).toBeInTheDocument();
  });

  it("renders 'Keep refining with Coach' button", () => {
    render(<DraftReadyCard {...defaultProps} />);

    const refineButton = screen.getByRole("button", {
      name: /keep refining/i,
    });
    expect(refineButton).toBeInTheDocument();
  });

  it("renders 'Discard' button", () => {
    render(<DraftReadyCard {...defaultProps} />);

    const discardButton = screen.getByRole("button", {
      name: /discard/i,
    });
    expect(discardButton).toBeInTheDocument();
  });

  it("calls onSend when 'Send this message' is clicked", async () => {
    const onSend = vi.fn();
    render(<DraftReadyCard {...defaultProps} onSend={onSend} />);

    const sendButton = screen.getByRole("button", {
      name: /send this message/i,
    });
    await userEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledOnce();
  });

  it("calls onEdit when 'Edit before sending' is clicked", async () => {
    const onEdit = vi.fn();
    render(<DraftReadyCard {...defaultProps} onEdit={onEdit} />);

    const editButton = screen.getByRole("button", {
      name: /edit before sending/i,
    });
    await userEvent.click(editButton);
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("calls onKeepRefining when 'Keep refining' is clicked", async () => {
    const onKeepRefining = vi.fn();
    render(
      <DraftReadyCard {...defaultProps} onKeepRefining={onKeepRefining} />,
    );

    const refineButton = screen.getByRole("button", {
      name: /keep refining/i,
    });
    await userEvent.click(refineButton);
    expect(onKeepRefining).toHaveBeenCalledOnce();
  });

  it("calls onDiscard when 'Discard' is clicked", async () => {
    const onDiscard = vi.fn();
    render(<DraftReadyCard {...defaultProps} onDiscard={onDiscard} />);

    const discardButton = screen.getByRole("button", {
      name: /discard/i,
    });
    await userEvent.click(discardButton);
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  it("'Send this message' is visually primary (distinct from other actions)", () => {
    render(<DraftReadyCard {...defaultProps} />);

    const sendButton = screen.getByRole("button", {
      name: /send this message/i,
    });
    const discardButton = screen.getByRole("button", {
      name: /discard/i,
    });

    // The primary button should have different styling than secondary buttons
    expect(sendButton.className).not.toBe(discardButton.className);
  });
});

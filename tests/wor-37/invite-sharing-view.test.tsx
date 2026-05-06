/**
 * WOR-37: Post-create invite sharing screen — unit tests
 *
 * Tests the presentational InviteSharingView component directly with mock props.
 * No Convex mocking needed — InviteSharingView is a pure presentational component.
 *
 * AC coverage:
 * - Heading with name
 * - Copyable link field
 * - Three share options (email, text, plain copy)
 * - Expandable suggested language
 * - Secondary CTA to private coaching
 * - Copy feedback (button state change)
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { InviteSharingView } from "@/pages/InviteSharingPage";
import type { InviteSharingViewProps } from "@/pages/InviteSharingPage";

// Save original clipboard so we can restore after tests that mock it
const originalClipboard = navigator.clipboard;
afterEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: originalClipboard,
    configurable: true,
  });
});

const defaultProps: InviteSharingViewProps = {
  otherPartyName: "Jordan",
  inviteUrl: "https://conflictcoach.app/invite/abc123token",
  mainTopic: "the project deadline disagreement",
  caseId: "cases:test1",
};

function renderView(overrides: Partial<InviteSharingViewProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(
    <MemoryRouter>
      <InviteSharingView {...props} />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// AC: Screen shows "Your case is ready. Send this link to [name]." heading
// ---------------------------------------------------------------------------
describe("AC: Heading with other party name", () => {
  test("displays heading with the other party's name", () => {
    renderView();
    const heading = screen.getByRole("heading", {
      name: /send this link to jordan/i,
    });
    expect(heading).toBeInTheDocument();
  });

  test("heading includes 'Your case is ready'", () => {
    renderView();
    expect(screen.getByText(/your case is ready/i)).toBeInTheDocument();
  });

  test("uses the provided otherPartyName in the heading", () => {
    renderView({ otherPartyName: "Alex" });
    expect(screen.getByText(/send this link to alex/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC: Invite link is displayed in a large, monospace copyable field with a
//     "Copy link" button
// ---------------------------------------------------------------------------
describe("AC: Copyable link field", () => {
  test("displays the full invite URL in the field", () => {
    renderView();
    const input = screen.getByDisplayValue(defaultProps.inviteUrl);
    expect(input).toBeInTheDocument();
  });

  test("link field has monospace styling (font-mono class)", () => {
    renderView();
    const input = screen.getByDisplayValue(defaultProps.inviteUrl);
    expect(input.className).toMatch(/font-mono/);
  });

  test("link field is readonly so users can select but not edit", () => {
    renderView();
    const input = screen.getByDisplayValue(
      defaultProps.inviteUrl,
    ) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  test("displays a 'Copy link' button near the field", () => {
    renderView();
    // Anchored regex: the inline button's accessible name must match
    // exactly, not be a substring. Necessary because the share-section's
    // "Just copy link" button also contains the substring "copy link"
    // and would otherwise produce an ambiguous getByRole match.
    expect(
      screen.getByRole("button", { name: /^Copy link$/i }),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC: Three share options: Copy for email (mailto:), Copy for text message
//     (shorter), Just copy link
// ---------------------------------------------------------------------------
describe("AC: Three share options", () => {
  test("renders a 'Copy for email' option", () => {
    renderView();
    expect(screen.getByText(/copy for email/i)).toBeInTheDocument();
  });

  test("renders a 'Copy for text message' option", () => {
    renderView();
    expect(screen.getByText(/copy for text message/i)).toBeInTheDocument();
  });

  test("renders a 'Just copy link' option", () => {
    renderView();
    expect(screen.getByText(/just copy link/i)).toBeInTheDocument();
  });

  test("'Copy for email' renders as an anchor with mailto: href", () => {
    renderView();
    const emailOption = screen.getByText(/copy for email/i).closest("a");
    expect(emailOption).not.toBeNull();
    expect(emailOption!.href).toMatch(/^mailto:/);
  });

  test("mailto: href body contains the invite URL", () => {
    renderView();
    const emailOption = screen.getByText(/copy for email/i).closest("a");
    expect(emailOption).not.toBeNull();
    // The invite URL should be encoded somewhere in the mailto href
    expect(emailOption!.href).toContain(
      encodeURIComponent(defaultProps.inviteUrl),
    );
  });

  test("mailto: subject references the main topic", () => {
    renderView();
    const emailOption = screen.getByText(/copy for email/i).closest("a");
    expect(emailOption).not.toBeNull();
    // The subject should contain the main topic
    expect(decodeURIComponent(emailOption!.href)).toMatch(
      /subject=.*project deadline/i,
    );
  });

  test("'Just copy link' writes raw URL to clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderView();
    const copyLinkButton = screen.getByRole("button", {
      name: /just copy link/i,
    });
    await user.click(copyLinkButton);

    expect(writeText).toHaveBeenCalledWith(defaultProps.inviteUrl);
  });

  test("'Copy for text message' writes a shorter message with the URL to clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderView();
    const textButton = screen.getByRole("button", {
      name: /copy for text message/i,
    });
    await user.click(textButton);

    expect(writeText).toHaveBeenCalledTimes(1);
    const copiedText = writeText.mock.calls[0][0] as string;
    // The text message copy should contain the invite URL
    expect(copiedText).toContain(defaultProps.inviteUrl);
    // It should be shorter than the full email-style message
    // (just product name + one-liner + link per contract)
    expect(copiedText.length).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// AC: Expandable "What should I tell them?" section with suggested sharing
//     language per DesignDoc §4.6
// ---------------------------------------------------------------------------
describe("AC: Expandable suggested language", () => {
  test("collapsible section is collapsed by default", () => {
    renderView();
    // The trigger text should be visible
    expect(screen.getByText(/what should i tell them/i)).toBeInTheDocument();
    // The suggested language content should NOT be visible.
    // If the Collapsible doesn't use forceMount, the element won't be in
    // the DOM at all (null). If it does use forceMount, it'll be hidden.
    // Both are valid collapsed states.
    const collapsedContent = screen.queryByText(
      /i found this thing called conflict coach/i,
    );
    if (collapsedContent) {
      expect(collapsedContent).not.toBeVisible();
    }
  });

  test("clicking the trigger expands to show suggested language", async () => {
    const user = userEvent.setup();
    renderView();

    const trigger = screen.getByText(/what should i tell them/i);
    await user.click(trigger);

    expect(
      screen.getByText(/i found this thing called conflict coach/i),
    ).toBeVisible();
  });

  test("suggested language contains the other party's name", async () => {
    const user = userEvent.setup();
    renderView();

    const trigger = screen.getByText(/what should i tell them/i);
    await user.click(trigger);

    // Per DesignDoc §4.6: "Hey [name] — I found this thing called Conflict Coach..."
    expect(screen.getByText(/hey jordan/i)).toBeVisible();
  });

  test("suggested language contains the topic", async () => {
    const user = userEvent.setup();
    renderView();

    const trigger = screen.getByText(/what should i tell them/i);
    await user.click(trigger);

    // Per DesignDoc §4.6: "...work through the [topic]..."
    expect(
      screen.getByText(/the project deadline disagreement/i),
    ).toBeVisible();
  });

  test("suggested language contains the invite link", async () => {
    const user = userEvent.setup();
    renderView();

    const trigger = screen.getByText(/what should i tell them/i);
    await user.click(trigger);

    expect(
      screen.getByText(
        new RegExp(
          defaultProps.inviteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        ),
      ),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// AC: Secondary CTA: "Or, start your private coaching now →" links to
//     /cases/:id/private
// ---------------------------------------------------------------------------
describe("AC: Secondary CTA to private coaching", () => {
  test("renders a link with 'start your private coaching now' text", () => {
    renderView();
    expect(
      screen.getByText(/start your private coaching now/i),
    ).toBeInTheDocument();
  });

  test("CTA links to /cases/:caseId/private", () => {
    renderView();
    const cta = screen
      .getByText(/start your private coaching now/i)
      .closest("a");
    expect(cta).not.toBeNull();
    expect(cta!.getAttribute("href")).toBe("/cases/cases:test1/private");
  });
});

// ---------------------------------------------------------------------------
// AC: Copy button shows success feedback (button state change)
// ---------------------------------------------------------------------------
describe("AC: Copy success feedback", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("'Copy link' button text changes to 'Copied!' after clicking", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderView();
    // Anchored regex: see explanation on the displays-button test.
    const copyButton = screen.getByRole("button", { name: /^Copy link$/i });
    await user.click(copyButton);

    expect(screen.getByText(/copied/i)).toBeInTheDocument();
  });

  test("button text reverts after approximately 2 seconds", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderView();
    const copyButton = screen.getByRole("button", { name: /^Copy link$/i });
    await user.click(copyButton);

    // Should show "Copied!" right after click
    expect(screen.getByText(/copied/i)).toBeInTheDocument();

    // Advance past the feedback timeout (~2s). Wrap in act() so React's
    // state update from setCopiedButton(null) is flushed before assertion.
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    // Should revert to "Copy link"
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /^Copy link$/i }),
      ).toBeInTheDocument();
    });
  });
});

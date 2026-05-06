/**
 * WOR-58: InviteeCaseForm presentational component tests
 *
 * AC3: Form UI matches case creation form steps 2–4: mainTopic (with character
 *      counter), description (with lock icon + "Private to you" helper),
 *      desiredOutcome (with lock icon + "Private to you" helper)
 * AC4: Privacy lock icons and helper text are present on private fields
 *      (description and desiredOutcome)
 * AC6: Form validates: mainTopic is required; inline error messages for
 *      missing fields
 *
 * Tests will FAIL until the implementation exists — correct red state.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InviteeCaseForm } from "@/components/InviteeCaseForm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderForm(
  overrides: Partial<{
    onSubmit: (v: { mainTopic: string; description: string; desiredOutcome: string }) => void;
    disabled: boolean;
    initialMainTopic: string;
  }> = {},
) {
  const onSubmit = overrides.onSubmit ?? vi.fn();
  return {
    onSubmit,
    ...render(
      <InviteeCaseForm
        onSubmit={onSubmit}
        disabled={overrides.disabled}
        initialMainTopic={overrides.initialMainTopic}
      />,
    ),
  };
}

// ===========================================================================
// AC3: Form UI matches case creation form steps 2–4
// ===========================================================================
describe("AC3: Form UI matches case creation steps 2–4", () => {
  it("renders a mainTopic input", () => {
    renderForm();
    expect(screen.getByLabelText(/Main Topic/i)).toBeInTheDocument();
  });

  it("renders a description textarea", () => {
    renderForm();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  it("renders a desiredOutcome textarea", () => {
    renderForm();
    expect(screen.getByLabelText(/Desired Outcome/i)).toBeInTheDocument();
  });

  it("shows a character counter for mainTopic starting at 0/140", () => {
    renderForm();
    expect(screen.getByText(/0\/140/)).toBeInTheDocument();
  });

  it("updates the character counter as the user types", async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText(/Main Topic/i);
    await user.type(input, "Hello");

    expect(screen.getByText(/5\/140/)).toBeInTheDocument();
  });

  it("character counter shows danger styling when exceeding 140 chars", async () => {
    const user = userEvent.setup();
    renderForm();

    const input = screen.getByLabelText(/Main Topic/i);
    const longText = "a".repeat(141);
    await user.type(input, longText);

    const counter = screen.getByText(/141\/140/);
    expect(counter).toBeInTheDocument();
    expect(counter.className).toMatch(/danger/);
  });

  it("all three fields are visible immediately (no progressive disclosure)", () => {
    renderForm();

    // Unlike NewCaseForm, all fields should be visible from the start
    expect(screen.getByLabelText(/Main Topic/i)).toBeVisible();
    expect(screen.getByLabelText(/Description/i)).toBeVisible();
    expect(screen.getByLabelText(/Desired Outcome/i)).toBeVisible();
  });

  it("does NOT render a category selection", () => {
    const { container } = renderForm();

    // No radiogroup, no <select>, no category-related elements
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(container.querySelectorAll("select")).toHaveLength(0);
  });

  it("pre-populates mainTopic from initialMainTopic prop", () => {
    renderForm({ initialMainTopic: "Budget disagreement" });

    const input = screen.getByLabelText(/Main Topic/i) as HTMLInputElement;
    expect(input.value).toBe("Budget disagreement");
  });
});

// ===========================================================================
// AC4: Privacy lock icons and helper text
// ===========================================================================
describe("AC4: Privacy lock icons and helper text on private fields", () => {
  it('shows "Private to you" helper text for description', () => {
    renderForm();
    const privateTexts = screen.getAllByText(/Private to you/i);
    expect(privateTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Private to you" helper text for both description and desiredOutcome', () => {
    renderForm();
    const privateTexts = screen.getAllByText(/Private to you/i);
    // Two instances: one for description, one for desiredOutcome
    expect(privateTexts.length).toBeGreaterThanOrEqual(2);
  });

  it("renders lock icons adjacent to private fields", () => {
    const { container } = renderForm();

    // Look for SVG lock icons near the private field labels
    const descSection = screen
      .getByLabelText(/Description/i)
      .closest("div")!.parentElement!;
    const descLock =
      descSection.querySelector('[data-testid="lock-icon"]') ??
      descSection.querySelector("svg");
    expect(descLock).not.toBeNull();

    const outcomeSection = screen
      .getByLabelText(/Desired Outcome/i)
      .closest("div")!.parentElement!;
    const outcomeLock =
      outcomeSection.querySelector('[data-testid="lock-icon"]') ??
      outcomeSection.querySelector("svg");
    expect(outcomeLock).not.toBeNull();
  });

  it("helper text mentions AI coach visibility", () => {
    renderForm();
    expect(
      screen.getAllByText(/Only you and the AI coach/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("mainTopic does NOT have a lock icon or 'Private to you' label", () => {
    renderForm();

    const mainTopicSection = screen
      .getByLabelText(/Main Topic/i)
      .closest("div")!.parentElement!;

    // mainTopic is shared, not private — no lock icon expected
    const lockIcon = mainTopicSection.querySelector('[data-testid="lock-icon"]');
    expect(lockIcon).toBeNull();
  });
});

// ===========================================================================
// AC6: Form validates: mainTopic is required; inline error messages
// ===========================================================================
describe("AC6: Form validation — mainTopic required", () => {
  it("shows inline error when submitting with empty mainTopic", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    // Click submit without typing anything
    const submitButton = screen.getByRole("button", { name: /continue to private coaching/i });
    await user.click(submitButton);

    // Should show an error message
    const errors = screen.getAllByRole("alert");
    const topicError = errors.find(
      (el) =>
        el.textContent?.toLowerCase().includes("topic") ||
        el.textContent?.toLowerCase().includes("required"),
    );
    expect(topicError).toBeDefined();

    // onSubmit must NOT be called
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears inline error after user types into mainTopic", async () => {
    const user = userEvent.setup();
    renderForm();

    // Trigger validation error
    const submitButton = screen.getByRole("button", { name: /continue to private coaching/i });
    await user.click(submitButton);

    // Error should be present
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);

    // Type into mainTopic
    const input = screen.getByLabelText(/Main Topic/i);
    await user.type(input, "Now I have a topic");

    // Error should be cleared
    const remainingErrors = screen.queryAllByRole("alert").filter(
      (el) =>
        el.textContent?.toLowerCase().includes("topic") ||
        el.textContent?.toLowerCase().includes("required"),
    );
    expect(remainingErrors).toHaveLength(0);
  });

  it("calls onSubmit with form values when mainTopic is filled", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    const mainTopicInput = screen.getByLabelText(/Main Topic/i);
    const descInput = screen.getByLabelText(/Description/i);
    const outcomeInput = screen.getByLabelText(/Desired Outcome/i);

    await user.type(mainTopicInput, "Budget conflict");
    await user.type(descInput, "We disagree on the split");
    await user.type(outcomeInput, "Fair 50/50 split");

    const submitButton = screen.getByRole("button", { name: /continue to private coaching/i });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      mainTopic: "Budget conflict",
      description: "We disagree on the split",
      desiredOutcome: "Fair 50/50 split",
    });
  });

  it("submits successfully with only mainTopic filled (description and desiredOutcome optional)", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    const mainTopicInput = screen.getByLabelText(/Main Topic/i);
    await user.type(mainTopicInput, "Budget topic");

    const submitButton = screen.getByRole("button", { name: /continue to private coaching/i });
    await user.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        mainTopic: "Budget topic",
      }),
    );
  });
});

// ===========================================================================
// Disabled state
// ===========================================================================
describe("Disabled state", () => {
  it("disables all inputs and submit button when disabled prop is true", () => {
    renderForm({ disabled: true });

    expect(screen.getByLabelText(/Main Topic/i)).toBeDisabled();
    expect(screen.getByLabelText(/Description/i)).toBeDisabled();
    expect(screen.getByLabelText(/Desired Outcome/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /continue to private coaching/i })).toBeDisabled();
  });
});

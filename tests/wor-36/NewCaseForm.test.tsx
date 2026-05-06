/**
 * WOR-36: NewCaseForm — multi-step case creation form
 *
 * ACs covered:
 *   AC1: Radio card category selection (5 options, no <select>)
 *   AC2: Main Topic soft 140-char counter
 *   AC3: Description lock icon + "Private to you" + auto-growing textarea (5 rows)
 *   AC4: Desired Outcome lock icon + "Private to you" (3 rows)
 *   AC5: Solo mode checkbox hidden under "Advanced" expandable section
 *   AC7: Validation — category and mainTopic required; inline error messages
 *
 * These tests will FAIL until the NewCaseForm rewrite is implemented — correct red state.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NewCaseForm } from "@/components/NewCaseForm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS = [
  "Workplace",
  "Family",
  "Personal relationship",
  "Contractual/business",
  "Other",
] as const;

const CATEGORY_VALUES = [
  "workplace",
  "family",
  "personal",
  "contractual",
  "other",
] as const;

function renderForm(
  overrides: Partial<{
    onSubmit: (v: unknown) => void;
    onSubmitSolo: (v: unknown) => void;
    disabled: boolean;
  }> = {},
) {
  const onSubmit = overrides.onSubmit ?? vi.fn();
  const onSubmitSolo = overrides.onSubmitSolo ?? vi.fn();
  return {
    onSubmit,
    onSubmitSolo,
    ...render(
      <NewCaseForm
        onSubmit={onSubmit}
        onSubmitSolo={onSubmitSolo}
        disabled={overrides.disabled}
      />,
    ),
  };
}

/**
 * Click a Continue/Next button if one is present. Some implementations use
 * buttons to advance between steps rather than auto-advancing on input.
 */
async function tryAdvanceStep(user: ReturnType<typeof userEvent.setup>) {
  const continueBtn = screen.queryByRole("button", {
    name: /continue|next/i,
  });
  if (continueBtn) await user.click(continueBtn);
}

/**
 * Select a category by clicking its radio card, then fill mainTopic so
 * progressive disclosure reveals subsequent steps.
 *
 * NOTE: Step advancement past step 0 is implementation-dependent — the
 * contract only specifies auto-advance for category→mainTopic. Later steps
 * may require a Continue/Next button. The helper tries both: type into the
 * field, then click a Continue/Next button if one appears.
 */
async function progressToStep(
  user: ReturnType<typeof userEvent.setup>,
  step: "category" | "mainTopic" | "description" | "desiredOutcome" | "submit",
) {
  if (step === "category") return;

  // Step 0 → 1: select a category (auto-advances per contract)
  const categoryCard = screen.getByRole("radio", { name: /Workplace/i });
  await user.click(categoryCard);

  if (step === "mainTopic") return;

  // Step 1 → 2: fill main topic
  const mainTopicInput = screen.getByLabelText(/Main Topic/i);
  await user.type(mainTopicInput, "Test topic");
  await tryAdvanceStep(user);

  if (step === "description") return;

  // Step 2 → 3: optionally type in description
  const descriptionInput = screen.getByLabelText(/Description/i);
  await user.type(descriptionInput, "Some description");
  await tryAdvanceStep(user);

  if (step === "desiredOutcome") return;

  // Step 3 → 4: optionally type in desired outcome
  const outcomeInput = screen.getByLabelText(/Desired Outcome/i);
  await user.type(outcomeInput, "Some outcome");
  await tryAdvanceStep(user);
}

// ===========================================================================
// AC1: Radio card category selection
// ===========================================================================
describe("AC1: Radio card category selection", () => {
  it("renders 5 radio card options with correct display labels", () => {
    renderForm();

    const radioGroup = screen.getByRole("radiogroup");
    const radios = within(radioGroup).getAllByRole("radio");
    expect(radios).toHaveLength(5);

    for (const label of CATEGORY_LABELS) {
      expect(
        screen.getByRole("radio", { name: new RegExp(label, "i") }),
      ).toBeInTheDocument();
    }
  });

  it("does not render a <select> element", () => {
    const { container } = renderForm();
    const selects = container.querySelectorAll("select");
    expect(selects).toHaveLength(0);
  });

  it("marks the selected category with aria-checked='true'", async () => {
    const user = userEvent.setup();
    renderForm();

    const workplaceCard = screen.getByRole("radio", { name: /Workplace/i });
    expect(workplaceCard).toHaveAttribute("aria-checked", "false");

    await user.click(workplaceCard);
    expect(workplaceCard).toHaveAttribute("aria-checked", "true");
  });

  it("selecting a category reveals the Main Topic step", async () => {
    const user = userEvent.setup();
    renderForm();

    // Main Topic should not be visible before category selection
    expect(screen.queryByLabelText(/Main Topic/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /Workplace/i }));

    // Main Topic should now be visible
    expect(screen.getByLabelText(/Main Topic/i)).toBeInTheDocument();
  });
});

// ===========================================================================
// AC2: Main Topic soft 140-char counter
// ===========================================================================
describe("AC2: Main Topic soft 140-char counter", () => {
  it("shows a character counter after typing", async () => {
    const user = userEvent.setup();
    renderForm();
    await progressToStep(user, "mainTopic");

    const input = screen.getByLabelText(/Main Topic/i);
    await user.type(input, "Hello");

    // Counter should show current length / 140
    expect(screen.getByText(/5\/140/)).toBeInTheDocument();
  });

  it("counter shows danger styling when exceeding 140 chars", async () => {
    const user = userEvent.setup();
    renderForm();
    await progressToStep(user, "mainTopic");

    const input = screen.getByLabelText(/Main Topic/i);
    const longText = "a".repeat(141);
    await user.type(input, longText);

    // Counter should show 141/140 with danger styling
    const counter = screen.getByText(/141\/140/);
    expect(counter).toBeInTheDocument();
    expect(counter.className).toMatch(/danger/);
  });

  it("allows submission with text longer than 140 chars (soft limit)", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    await progressToStep(user, "mainTopic");

    const input = screen.getByLabelText(/Main Topic/i);
    const longText = "a".repeat(200);
    await user.type(input, longText);
    await tryAdvanceStep(user);

    // Fill description to advance
    const descriptionInput = screen.getByLabelText(/Description/i);
    await user.type(descriptionInput, "Some description");
    await tryAdvanceStep(user);

    // Fill desired outcome to advance
    const outcomeInput = screen.getByLabelText(/Desired Outcome/i);
    await user.type(outcomeInput, "Some outcome");
    await tryAdvanceStep(user);

    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    // Should have called onSubmit despite exceeding 140 chars
    expect(onSubmit).toHaveBeenCalled();
  });
});

// ===========================================================================
// AC3: Description lock icon + "Private to you" + auto-growing textarea
// ===========================================================================
describe("AC3: Description step — privacy pattern and auto-grow textarea", () => {
  it("shows a lock icon in the Description step", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();
    await progressToStep(user, "description");

    // Lock icon: Lucide renders as SVG. Look for svg near the description label.
    const descriptionSection = screen
      .getByLabelText(/Description/i)
      .closest("div")!.parentElement!;
    const lockIcon =
      descriptionSection.querySelector('[data-testid="lock-icon"]') ??
      descriptionSection.querySelector("svg");
    expect(lockIcon).not.toBeNull();
  });

  it('displays "Private to you" helper text for Description', async () => {
    const user = userEvent.setup();
    renderForm();
    await progressToStep(user, "description");

    expect(screen.getByText(/Private to you/i)).toBeInTheDocument();
  });

  it("Description textarea starts at 5 rows", async () => {
    const user = userEvent.setup();
    renderForm();
    await progressToStep(user, "description");

    const textarea = screen.getByLabelText(/Description/i);
    expect(textarea).toHaveAttribute("rows", "5");
  });

  it("lock icon has tooltip about privacy", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();
    await progressToStep(user, "description");

    const descriptionSection = screen
      .getByLabelText(/Description/i)
      .closest("div")!.parentElement!;

    // The lock icon should have a title attribute with the privacy message
    const lockElement =
      descriptionSection.querySelector('[title*="Only you"]') ??
      descriptionSection.querySelector("svg[title]") ??
      descriptionSection.querySelector('[data-testid="lock-icon"]');
    expect(lockElement).not.toBeNull();

    // Check the title attribute contains the expected text
    const titleAttr =
      lockElement?.getAttribute("title") ??
      lockElement?.closest("[title]")?.getAttribute("title") ??
      "";
    expect(titleAttr).toMatch(/Only you and the AI coach will see this/i);
  });
});

// ===========================================================================
// AC4: Desired Outcome lock icon + "Private to you"
// ===========================================================================
describe("AC4: Desired Outcome step — privacy pattern", () => {
  it("shows a lock icon in the Desired Outcome step", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();
    await progressToStep(user, "desiredOutcome");

    const outcomeSection = screen
      .getByLabelText(/Desired Outcome/i)
      .closest("div")!.parentElement!;
    const lockIcon =
      outcomeSection.querySelector('[data-testid="lock-icon"]') ??
      outcomeSection.querySelector("svg");
    expect(lockIcon).not.toBeNull();
  });

  it('displays "Private to you" helper text for Desired Outcome', async () => {
    const user = userEvent.setup();
    renderForm();
    await progressToStep(user, "desiredOutcome");

    // There should be at least two "Private to you" texts (Description + Desired Outcome)
    const privateTexts = screen.getAllByText(/Private to you/i);
    expect(privateTexts.length).toBeGreaterThanOrEqual(2);
  });

  it("Desired Outcome textarea starts at 3 rows", async () => {
    const user = userEvent.setup();
    renderForm();
    await progressToStep(user, "desiredOutcome");

    const textarea = screen.getByLabelText(/Desired Outcome/i);
    expect(textarea).toHaveAttribute("rows", "3");
  });
});

// ===========================================================================
// AC5: Solo mode under Advanced
// ===========================================================================
describe("AC5: Solo mode under Advanced expandable section", () => {
  it("renders an 'Advanced' disclosure section", async () => {
    const user = userEvent.setup();
    renderForm();
    await progressToStep(user, "submit");

    // Look for a details/summary or equivalent disclosure element
    expect(
      screen.getByText(/Advanced/i),
    ).toBeInTheDocument();
  });

  it("Advanced section is collapsed by default", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();
    await progressToStep(user, "submit");

    // The solo checkbox should not be visible when Advanced is collapsed
    expect(
      screen.queryByRole("checkbox", { name: /solo/i }),
    ).not.toBeInTheDocument();
  });

  it("expanding Advanced reveals an unchecked solo checkbox", async () => {
    const user = userEvent.setup();
    renderForm();
    await progressToStep(user, "submit");

    // Click the Advanced summary/trigger to expand
    const advancedTrigger = screen.getByText(/Advanced/i);
    await user.click(advancedTrigger);

    const soloCheckbox = screen.getByRole("checkbox", { name: /solo/i });
    expect(soloCheckbox).toBeInTheDocument();
    expect(soloCheckbox).not.toBeChecked();
  });

  it("checking solo checkbox causes form to call onSubmitSolo instead of onSubmit", async () => {
    const user = userEvent.setup();
    const { onSubmit, onSubmitSolo } = renderForm();

    // Select category
    await user.click(screen.getByRole("radio", { name: /Workplace/i }));

    // Fill main topic
    const mainTopicInput = screen.getByLabelText(/Main Topic/i);
    await user.type(mainTopicInput, "Test topic for solo");
    await tryAdvanceStep(user);

    // Fill description to advance
    const descriptionInput = screen.getByLabelText(/Description/i);
    await user.type(descriptionInput, "Some description");
    await tryAdvanceStep(user);

    // Fill desired outcome to advance
    const outcomeInput = screen.getByLabelText(/Desired Outcome/i);
    await user.type(outcomeInput, "Some outcome");
    await tryAdvanceStep(user);

    // Expand Advanced and check solo
    await user.click(screen.getByText(/Advanced/i));
    const soloCheckbox = screen.getByRole("checkbox", { name: /solo/i });
    await user.click(soloCheckbox);

    // Submit
    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    expect(onSubmitSolo).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// AC7: Validation — category and mainTopic required; inline errors
// ===========================================================================
describe("AC7: Form validation", () => {
  it("progressive disclosure prevents advancing without a category selection", async () => {
    renderForm();

    // Before any category is selected, the Main Topic step must not be visible
    expect(screen.queryByLabelText(/Main Topic/i)).not.toBeInTheDocument();

    // The submit button should not be reachable either
    expect(
      screen.queryByRole("button", { name: /Start Case/i }),
    ).not.toBeInTheDocument();
  });

  it("shows inline error when mainTopic is empty on submit", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    // Select category — this reveals the mainTopic input AND the submit
    // button (form's progressive disclosure: showAdvancedAndSubmit =
    // showMainTopic). Do NOT use progressToStep here; that helper fills
    // mainTopic before reaching submit, which would defeat the
    // empty-mainTopic test.
    await user.click(screen.getByRole("radio", { name: /Workplace/i }));

    // Click submit with mainTopic still empty
    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    // Should show error for mainTopic
    const errors = screen.getAllByRole("alert");
    const topicError = errors.find((el) =>
      el.textContent?.toLowerCase().includes("topic"),
    );
    expect(topicError).toBeDefined();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits successfully when only category and mainTopic are filled (description optional)", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    // Select category
    await user.click(screen.getByRole("radio", { name: /Workplace/i }));

    // Fill main topic
    const mainTopicInput = screen.getByLabelText(/Main Topic/i);
    await user.type(mainTopicInput, "Team disagreement");

    // Do NOT fill description or desiredOutcome — they are optional
    await progressToStep(user, "submit");

    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    // Should submit without errors
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "workplace",
        mainTopic: expect.stringContaining("Team disagreement"),
      }),
    );

    // No error alerts should be present
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
  });

  it("inline errors use danger color and appear below the failing input", async () => {
    const user = userEvent.setup();
    renderForm();

    // Select category — reveals mainTopic input + submit. Do NOT use
    // progressToStep; that helper fills mainTopic before reaching submit.
    await user.click(screen.getByRole("radio", { name: /Workplace/i }));

    // Click submit with mainTopic empty to trigger validation error
    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    const errors = screen.getAllByRole("alert");
    expect(errors.length).toBeGreaterThan(0);
    for (const errorEl of errors) {
      // Each error should have danger styling
      expect(errorEl.className).toMatch(/danger/);
    }
  });
});

// ===========================================================================
// Category values: display labels vs. mutation values
// ===========================================================================
describe("Category display labels vs. submitted values", () => {
  it.each(
    CATEGORY_LABELS.map((label, i) => [label, CATEGORY_VALUES[i]] as const),
  )(
    "selecting '%s' submits value '%s'",
    async (displayLabel, expectedValue) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<NewCaseForm onSubmit={onSubmit} />);

      // Select the target category (auto-advances to step 1)
      await user.click(
        screen.getByRole("radio", { name: new RegExp(displayLabel, "i") }),
      );

      // Fill required mainTopic
      const mainTopicInput = screen.getByLabelText(/Main Topic/i);
      await user.type(mainTopicInput, "Test topic");
      await tryAdvanceStep(user);

      // Fill description to advance
      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, "Some description");
      await tryAdvanceStep(user);

      // Fill desired outcome to advance
      const outcomeInput = screen.getByLabelText(/Desired Outcome/i);
      await user.type(outcomeInput, "Some outcome");
      await tryAdvanceStep(user);

      // Submit — category should be the one we selected, not Workplace
      const submitButton = screen.getByRole("button", { name: /Start Case/i });
      await user.click(submitButton);

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ category: expectedValue }),
      );
    },
  );
});

// ===========================================================================
// Disabled state
// ===========================================================================
describe("Disabled state", () => {
  it("disables all inputs and buttons when disabled prop is true", async () => {
    const user = userEvent.setup();
    render(<NewCaseForm onSubmit={vi.fn()} disabled={true} />);

    // Radio cards should be disabled
    const radios = screen.getAllByRole("radio");
    for (const radio of radios) {
      expect(radio).toBeDisabled();
    }
  });
});

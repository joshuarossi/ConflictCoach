/**
 * WOR-36: NewCasePage — mutation call and post-submit navigation
 *
 * ACs covered:
 *   AC6: Submit calls cases/create mutation and routes to /cases/:id/invite
 *
 * Uses mocked Convex mutation and mocked useNavigate to verify:
 *   - Mutation payload shape (category, mainTopic, description, desiredOutcome, isSolo)
 *   - Navigation target is /cases/:id/invite (not /cases/:id)
 *   - Solo mode path also navigates correctly
 *
 * These tests will FAIL until the NewCasePage routing fix is implemented — correct red state.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockCreateCase = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => mockCreateCase,
}));

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

import { NewCasePage } from "@/pages/NewCasePage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/cases/new"]}>
      <NewCasePage />
    </MemoryRouter>,
  );
}

/**
 * Fill out the form's required fields using the new multi-step progressive
 * disclosure UI (radio cards for category, then mainTopic input).
 */
async function fillRequiredFields(
  user: ReturnType<typeof userEvent.setup>,
  opts: { category?: string; mainTopic?: string } = {},
) {
  const categoryLabel = opts.category ?? "Workplace";
  const mainTopicText = opts.mainTopic ?? "Disagreement about project scope";

  // Step 0: select category via radio card
  const categoryCard = screen.getByRole("radio", {
    name: new RegExp(categoryLabel, "i"),
  });
  await user.click(categoryCard);

  // Step 1: fill main topic
  const mainTopicInput = screen.getByLabelText(/Main Topic/i);
  await user.type(mainTopicInput, mainTopicText);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AC6: Submit calls mutation and routes to invite screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateCase.mockResolvedValue({
      caseId: "test-case-id-123",
      inviteUrl: "https://example.com/invite/abc",
    });
  });

  it("calls the create mutation with correct payload on submit", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);

    // Submit the form
    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    expect(mockCreateCase).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "workplace",
        mainTopic: expect.stringContaining("Disagreement about project scope"),
        isSolo: false,
      }),
    );
  });

  it("navigates to /cases/:id/invite on successful submit", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);

    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    // Wait for async mutation to resolve. Navigate is called with
    // (path, optional state object) — assert on path only since the
    // state payload is an internal optimization for InviteSharingPage.
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
      expect(mockNavigate.mock.calls[0][0]).toBe(
        "/cases/test-case-id-123/invite",
      );
    });
  });

  it("does NOT navigate to /cases/:id (old behavior)", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);

    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });

    // Must NOT navigate to the old route without /invite
    expect(mockNavigate).not.toHaveBeenCalledWith("/cases/test-case-id-123");
  });

  it("sends optional fields as undefined when empty", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);

    // Do not fill description or desiredOutcome
    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    expect(mockCreateCase).toHaveBeenCalledWith(
      expect.objectContaining({
        description: undefined,
        desiredOutcome: undefined,
      }),
    );
  });

  it("submits with isSolo=true when solo checkbox is checked", async () => {
    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);

    // Expand Advanced section and check solo checkbox
    const advancedTrigger = screen.getByText(/Advanced/i);
    await user.click(advancedTrigger);

    const soloCheckbox = screen.getByRole("checkbox", { name: /solo/i });
    await user.click(soloCheckbox);

    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    expect(mockCreateCase).toHaveBeenCalledWith(
      expect.objectContaining({
        isSolo: true,
      }),
    );

    // Should still navigate to invite page. Navigate is called with
    // (path, optional state object) — assert on path only.
    await vi.waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
      expect(mockNavigate.mock.calls[0][0]).toBe(
        "/cases/test-case-id-123/invite",
      );
    });
  });

  it("displays error message when mutation fails", async () => {
    mockCreateCase.mockRejectedValueOnce(new Error("Network error"));

    const user = userEvent.setup();
    renderPage();

    await fillRequiredFields(user);

    const submitButton = screen.getByRole("button", { name: /Start Case/i });
    await user.click(submitButton);

    // Error message should appear
    const errorAlert = await screen.findByRole("alert");
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert.textContent).toMatch(/Network error/i);

    // Should NOT navigate on error
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

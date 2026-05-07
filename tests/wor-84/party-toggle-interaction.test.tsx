/**
 * WOR-84: PartyToggle click interaction
 *
 * Tests assert that clicking segments switches the active party via the
 * ?as query param. Expected to PASS against current code — this test
 * confirms existing behavior is preserved during the styling fix.
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PartyToggle } from "@/components/PartyToggle";

function renderToggle(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/cases/test-id${search}`]}>
      <PartyToggle />
    </MemoryRouter>,
  );
}

describe("WOR-84: PartyToggle interaction", () => {
  // --- AC5: Clicking segments switches active party via ?as param ---
  test("default state (no ?as param): Alex button is active", () => {
    renderToggle();
    const alexBtn = screen.getByTestId("toggle-initiator");
    expect(alexBtn).toHaveAttribute("aria-pressed", "true");

    const jordanBtn = screen.getByTestId("toggle-invitee");
    expect(jordanBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("clicking Jordan button sets aria-pressed on Jordan", async () => {
    const user = userEvent.setup();
    renderToggle();

    const jordanBtn = screen.getByTestId("toggle-invitee");
    await user.click(jordanBtn);

    expect(jordanBtn).toHaveAttribute("aria-pressed", "true");

    const alexBtn = screen.getByTestId("toggle-initiator");
    expect(alexBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("clicking Alex button after Jordan restores Alex as active", async () => {
    const user = userEvent.setup();
    renderToggle("?as=invitee");

    const alexBtn = screen.getByTestId("toggle-initiator");
    await user.click(alexBtn);

    expect(alexBtn).toHaveAttribute("aria-pressed", "true");

    const jordanBtn = screen.getByTestId("toggle-invitee");
    expect(jordanBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("with ?as=invitee, Jordan button is initially active", () => {
    renderToggle("?as=invitee");
    const jordanBtn = screen.getByTestId("toggle-invitee");
    expect(jordanBtn).toHaveAttribute("aria-pressed", "true");

    const alexBtn = screen.getByTestId("toggle-initiator");
    expect(alexBtn).toHaveAttribute("aria-pressed", "false");
  });
});

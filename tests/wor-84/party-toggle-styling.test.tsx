/**
 * WOR-84: PartyToggle styling contract
 *
 * Tests assert the visual styling classes required by DesignDoc §3.2 /
 * style-guide §12. Expected to FAIL (red state) until the implementation
 * updates PartyToggle.tsx with the correct design-token classes.
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PartyToggle } from "@/components/PartyToggle";

function renderToggle(search = "?as=initiator") {
  return render(
    <MemoryRouter initialEntries={[`/cases/test-id${search}`]}>
      <PartyToggle />
    </MemoryRouter>,
  );
}

describe("WOR-84: PartyToggle styling", () => {
  // --- AC1: Container styling ---
  describe("AC1: container has bg-coach-subtle, border-coach-accent, rounded-md, p-0.5", () => {
    test("container has bg-coach-subtle background", () => {
      renderToggle();
      const container = screen.getByTestId("party-toggle");
      expect(container.className).toContain("bg-coach-subtle");
    });

    test("container has border-coach-accent border", () => {
      renderToggle();
      const container = screen.getByTestId("party-toggle");
      expect(container.className).toContain("border-coach-accent");
    });

    test("container has rounded-md", () => {
      renderToggle();
      const container = screen.getByTestId("party-toggle");
      expect(container.className).toContain("rounded-md");
    });

    test("container has p-0.5 padding", () => {
      renderToggle();
      const container = screen.getByTestId("party-toggle");
      expect(container.className).toContain("p-0.5");
    });
  });

  // --- AC2: VIEWING AS label ---
  describe("AC2: VIEWING AS label with correct styling", () => {
    test("VIEWING AS label is present", () => {
      renderToggle();
      expect(screen.getByText("VIEWING AS")).toBeInTheDocument();
    });

    test("VIEWING AS label has text-coach-accent", () => {
      renderToggle();
      const label = screen.getByText("VIEWING AS");
      expect(label.className).toContain("text-coach-accent");
    });

    test("VIEWING AS label has uppercase styling", () => {
      renderToggle();
      const label = screen.getByText("VIEWING AS");
      expect(label.className).toContain("uppercase");
    });

    test("VIEWING AS label has text-[11px] font size", () => {
      renderToggle();
      const label = screen.getByText("VIEWING AS");
      expect(label.className).toContain("text-[11px]");
    });

    test("VIEWING AS label has font-medium", () => {
      renderToggle();
      const label = screen.getByText("VIEWING AS");
      expect(label.className).toContain("font-medium");
    });

    test("VIEWING AS label has tracking-[0.05em] letter-spacing", () => {
      renderToggle();
      const label = screen.getByText("VIEWING AS");
      expect(label.className).toContain("tracking-[0.05em]");
    });
  });

  // --- AC3: Active segment styling ---
  describe("AC3: active segment uses bg-surface, text-text-primary, shadow-1", () => {
    test("active button has bg-surface", () => {
      renderToggle("?as=initiator");
      const activeBtn = screen.getByTestId("toggle-initiator");
      expect(activeBtn.className).toContain("bg-surface");
    });

    test("active button has text-text-primary", () => {
      renderToggle("?as=initiator");
      const activeBtn = screen.getByTestId("toggle-initiator");
      expect(activeBtn.className).toContain("text-text-primary");
    });

    test("active button has shadow-1", () => {
      renderToggle("?as=initiator");
      const activeBtn = screen.getByTestId("toggle-initiator");
      expect(activeBtn.className).toContain("shadow-1");
    });

    test("active button does NOT have bg-coach-accent", () => {
      renderToggle("?as=initiator");
      const activeBtn = screen.getByTestId("toggle-initiator");
      expect(activeBtn.className).not.toContain("bg-coach-accent");
    });
  });

  // --- AC4: Inactive segment styling ---
  describe("AC4: inactive segment uses text-text-secondary, not text-coach-accent", () => {
    test("inactive button has text-text-secondary", () => {
      renderToggle("?as=initiator");
      const inactiveBtn = screen.getByTestId("toggle-invitee");
      expect(inactiveBtn.className).toContain("text-text-secondary");
    });

    test("inactive button does NOT have text-coach-accent", () => {
      renderToggle("?as=initiator");
      const inactiveBtn = screen.getByTestId("toggle-invitee");
      expect(inactiveBtn.className).not.toContain("text-coach-accent");
    });
  });
});

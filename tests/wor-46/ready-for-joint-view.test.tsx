/**
 * WOR-46: Ready for Joint frontend — unit tests
 *
 * Tests cover all 8 acceptance criteria for the ReadyForJointView component:
 * synthesis card styling, privacy label, markdown rendering, three sections,
 * primary CTA button, mutation call on click, CTA note, and mySynthesis query usage.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ---------------------------------------------------------------------------
// Synthesis fixture — markdown with the three required section headings
// ---------------------------------------------------------------------------
const SYNTHESIS_MARKDOWN = `## Areas of likely agreement

Both parties value **clear communication** and want a resolution.

## Points needing discussion

There is disagreement about **timeline expectations** and resource allocation.

## Suggested approach

Start with the areas of agreement to build momentum before tackling the harder points.`;

// ---------------------------------------------------------------------------
// Mock setup — Convex hooks & auth
// ---------------------------------------------------------------------------
const mockEnterJointSession = vi.fn().mockResolvedValue(undefined);
const mockNavigate = vi.fn();

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("../../convex/_generated/api", () => ({
  api: {
    users: { me: "users:me" },
    cases: { get: "cases:get", partyStates: "cases:partyStates" },
    jointChat: {
      mySynthesis: "jointChat:mySynthesis",
      enterJointSession: "jointChat:enterJointSession",
      messages: "jointChat:messages",
      sendUserMessage: vi.fn(),
    },
    privateCoaching: {
      messages: "privateCoaching:messages",
      sendUserMessage: vi.fn(),
      markComplete: vi.fn(),
    },
  },
}));

// Track which query tokens are requested to verify mySynthesis is consumed
const queriedTokens: string[] = [];

vi.mock("convex/react", () => ({
  useQuery: (token: string) => {
    queriedTokens.push(token);
    switch (token) {
      case "users:me":
        return { role: "USER", displayName: "Test User", _id: "users:test" };
      case "cases:get":
        return {
          _id: "cases:test",
          status: "READY_FOR_JOINT",
          otherPartyName: "Jordan",
          isSolo: false,
          category: "workplace",
          mainTopic: "Test conflict",
        };
      case "jointChat:mySynthesis":
        return { synthesisText: SYNTHESIS_MARKDOWN };
      default:
        return undefined;
    }
  },
  useMutation: () => mockEnterJointSession,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ caseId: "cases:test" }),
  };
});

// @ts-expect-error WOR-46 red-state import: implementation is created by task-implement.
import { ReadyForJointView } from "../../src/components/ReadyForJointView";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderView() {
  return render(
    <MemoryRouter initialEntries={["/cases/cases:test/ready"]}>
      <ReadyForJointView caseId="cases:test" />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("WOR-46: ReadyForJointView", () => {
  beforeEach(() => {
    mockEnterJointSession.mockClear();
    mockNavigate.mockClear();
    queriedTokens.length = 0;
  });

  // AC1: Synthesis card renders with --private-tint background and lock icon
  describe("AC: Synthesis card renders with --private-tint background and lock icon", () => {
    test("renders a lock icon element", () => {
      renderView();
      const lockIcon = screen.getByLabelText(/lock/i);
      expect(lockIcon).toBeInTheDocument();
    });

    test("synthesis card has private-tint styling", () => {
      const { container } = renderView();
      // The card should reference the --private-tint design token via class or inline style
      const privateTintEl = container.querySelector(
        "[class*='private-tint'], [style*='private-tint']",
      );
      expect(privateTintEl).not.toBeNull();
    });
  });

  // AC2: Label reads "Private to you — Jordan has their own version"
  describe('AC: Label reads "Private to you — Jordan has their own version"', () => {
    test("displays privacy label with other party name", () => {
      renderView();
      expect(
        screen.getByText(/private to you/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Jordan has their own version/i),
      ).toBeInTheDocument();
    });
  });

  // AC3: Synthesis text is rendered with markdown formatting (headings, bold)
  describe("AC: Synthesis text is rendered with markdown formatting", () => {
    test("renders markdown headings as <h2> elements", () => {
      const { container } = renderView();
      const headings = container.querySelectorAll("h2");
      expect(headings.length).toBeGreaterThanOrEqual(3);
    });

    test("renders bold markdown as <strong> elements", () => {
      const { container } = renderView();
      const boldElements = container.querySelectorAll("strong");
      expect(boldElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // AC4: Three sections visible
  describe("AC: Three sections are visible", () => {
    test("renders 'Areas of likely agreement' section heading", () => {
      renderView();
      expect(
        screen.getByText(/areas of likely agreement/i),
      ).toBeInTheDocument();
    });

    test("renders 'Points needing discussion' section heading", () => {
      renderView();
      expect(
        screen.getByText(/points needing discussion/i),
      ).toBeInTheDocument();
    });

    test("renders 'Suggested approach' section heading", () => {
      renderView();
      expect(
        screen.getByText(/suggested approach/i),
      ).toBeInTheDocument();
    });
  });

  // AC5: "Enter Joint Session" is a large primary button — the single primary action
  describe('AC: "Enter Joint Session" is primary button', () => {
    test("renders a button with text 'Enter Joint Session'", () => {
      renderView();
      const btn = screen.getByRole("button", { name: /enter joint session/i });
      expect(btn).toBeInTheDocument();
    });

    test("the Enter Joint Session button is the only primary-styled button", () => {
      const { container } = renderView();
      const enterBtn = screen.getByRole("button", { name: /enter joint session/i });
      // shadcn/ui default (primary) variant uses "bg-primary" class
      expect(enterBtn.className).toMatch(/bg-primary/);
      // Non-primary variant classes should be absent
      const nonPrimaryClasses = ["bg-secondary", "bg-destructive", "border-input"];
      for (const cls of nonPrimaryClasses) {
        expect(enterBtn.className).not.toMatch(new RegExp(cls));
      }
      // No other button on the page should have the primary variant class
      const allButtons = container.querySelectorAll("button");
      const otherPrimaryButtons = Array.from(allButtons).filter(
        (btn) => btn !== enterBtn && btn.className.match(/bg-primary/),
      );
      expect(otherPrimaryButtons).toHaveLength(0);
    });
  });

  // AC6: Clicking "Enter Joint Session" advances case status to JOINT_ACTIVE via mutation
  describe("AC: Clicking Enter advances status to JOINT_ACTIVE via mutation", () => {
    test("calls enterJointSession mutation with caseId when clicked", async () => {
      renderView();
      const btn = screen.getByRole("button", { name: /enter joint session/i });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockEnterJointSession).toHaveBeenCalledWith(
          expect.objectContaining({ caseId: "cases:test" }),
        );
      });
    });

    test("navigates to joint chat page after successful mutation", async () => {
      renderView();
      const btn = screen.getByRole("button", { name: /enter joint session/i });
      fireEvent.click(btn);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          expect.stringContaining("/joint"),
        );
      });
    });
  });

  // AC7: Note below CTA
  describe('AC: Note below CTA: "Jordan will see you\'ve entered when they enter too."', () => {
    test("displays informational note with other party name", () => {
      renderView();
      expect(
        screen.getByText(/will see you've entered when they enter too/i),
      ).toBeInTheDocument();
    });

    test("note includes the other party name (Jordan)", () => {
      renderView();
      const noteText = screen.getByText(
        /jordan will see you've entered/i,
      );
      expect(noteText).toBeInTheDocument();
    });
  });

  // AC8: Synthesis remains accessible via "View my guidance" link after entering
  // (This ticket verifies the mySynthesis query is consumed; T27 wires the link.)
  describe("AC: Synthesis accessible — mySynthesis query is used", () => {
    test("component calls useQuery with jointChat:mySynthesis token", () => {
      renderView();
      expect(queriedTokens).toContain("jointChat:mySynthesis");
    });
  });
});

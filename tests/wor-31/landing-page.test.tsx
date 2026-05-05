/**
 * WOR-31: Landing page — Unit tests
 *
 * Tests cover acceptance criteria that can be verified by rendering the
 * LandingPage component in isolation (no browser, no auth).
 *
 * AC2: Hero displays tagline
 * AC3: Three-step explainer section is present
 * AC4: Privacy section with "Your words are yours" messaging
 * AC5: Footer includes terms and privacy policy links
 * AC8: No testimonials, no pricing, no repeated CTAs
 */
import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

// Mock Convex auth — LandingPage is public but may read auth state for redirect
vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: false }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));

import { LandingPage } from "@/pages/LandingPage";

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <LandingPage />
    </MemoryRouter>,
  );
}

describe("WOR-31: Landing page", () => {
  // ── AC2: Hero displays tagline ──────────────────────────────────────
  test("AC2: hero displays the exact tagline text", () => {
    renderLanding();
    expect(
      screen.getByText(
        "A calm place to work through a difficult conversation.",
      ),
    ).toBeInTheDocument();
  });

  // ── AC3: Three-step explainer section ───────────────────────────────
  test("AC3: three-step explainer section renders three distinct step elements", () => {
    const { container } = renderLanding();
    // The spec requires an iconographic layout with three distinct steps,
    // not just a comma-separated string. Look for elements that individually
    // represent each step (e.g. headings, list items, or data-testid markers).
    const stepIndicators = container.querySelectorAll(
      '[data-testid^="step-"], [data-testid^="explainer-step"]',
    );
    // Fallback: count elements whose text matches the three step names individually
    const stepTexts = ["Private Coaching", "Shared Conversation", "Resolution"];
    const foundSteps = stepTexts.filter((text) => {
      // Look for a heading or distinct block element (not inline within a paragraph)
      const headings = screen.queryAllByText(new RegExp(`^${text}$`, "i"));
      return headings.some(
        (el) => el.tagName !== "P" && el.closest("p") === null,
      );
    });

    // At least one strategy must yield three step elements
    const hasStepTestIds = stepIndicators.length >= 3;
    const hasStepHeadings = foundSteps.length === 3;
    expect(hasStepTestIds || hasStepHeadings).toBe(true);
  });

  // ── AC4: Privacy section ────────────────────────────────────────────
  test('AC4: privacy section displays "Your words are yours" messaging', () => {
    renderLanding();
    expect(screen.getByText(/Your words are yours/i)).toBeInTheDocument();
  });

  // ── AC5: Footer terms and privacy links ─────────────────────────────
  test("AC5: footer contains a terms link", () => {
    renderLanding();
    const termsLink = screen.getByRole("link", { name: /terms/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href", expect.stringContaining("terms"));
  });

  test("AC5: footer contains a privacy policy link", () => {
    renderLanding();
    const privacyLink = screen.getByRole("link", { name: /privacy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute(
      "href",
      expect.stringContaining("privacy"),
    );
  });

  // ── AC6 (partial, unit-level): Primary CTA links to /login ─────────
  test('AC6: primary CTA "Start a case" has href to /login', () => {
    renderLanding();
    const cta = screen.getByRole("link", { name: /Start a case/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/login");
  });

  // ── AC8: No testimonials, no pricing, no repeated CTAs ──────────────
  test("AC8: page does not contain testimonials or pricing content", () => {
    const { container } = renderLanding();
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("testimonial");
    expect(text).not.toContain("pricing");
  });

  test("AC8: only one primary CTA is rendered", () => {
    renderLanding();
    const ctas = screen.getAllByRole("link", { name: /Start a case/i });
    expect(ctas).toHaveLength(1);
  });

  // ── Semantic HTML: uses <main> landmark ─────────────────────────────
  test("page uses a <main> landmark element", () => {
    renderLanding();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});

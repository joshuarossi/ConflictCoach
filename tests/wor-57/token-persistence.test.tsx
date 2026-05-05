/**
 * WOR-57: Invite acceptance — Token persistence (AC2)
 *
 * AC2: Token is stashed in URL/localStorage and survives the full auth flow.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: false }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => ({
    initiatorName: "Alex",
    mainTopic: "Workplace disagreement",
    category: "workplace",
  }),
  useMutation: () => vi.fn(),
}));

import { InviteAcceptPage } from "@/pages/InviteAcceptPage";

const TEST_TOKEN = "validtoken123abc456def789";

beforeEach(() => {
  localStorage.clear();
});

function renderPage(token = TEST_TOKEN) {
  return render(
    <MemoryRouter initialEntries={[`/invite/${token}`]}>
      <InviteAcceptPage />
    </MemoryRouter>,
  );
}

describe("WOR-57: Token survives auth flow", () => {
  test("AC2: clicking sign-in stashes token in localStorage", () => {
    renderPage();

    const signInBtn = screen.getByRole("button", {
      name: /sign in to continue/i,
    });
    fireEvent.click(signInBtn);

    expect(localStorage.getItem("pendingInviteToken")).toBe(TEST_TOKEN);
  });

  test("AC2: token value is preserved in localStorage exactly as received", () => {
    const specificToken = "xyzabc789012345678901234567890ab";
    renderPage(specificToken);

    const signInBtn = screen.getByRole("button", {
      name: /sign in to continue/i,
    });
    fireEvent.click(signInBtn);

    expect(localStorage.getItem("pendingInviteToken")).toBe(specificToken);
  });
});

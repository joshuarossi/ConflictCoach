/**
 * Tests for WOR-55 AC4: useActingPartyUserId hook returns the appropriate
 * userId based on toggle state (?as=initiator|invitee).
 *
 * The hook does not exist yet. Tests import from a stub that exports
 * `undefined`. They will fail because it's not a real hook — correct red state.
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

import { useActingPartyUserId } from "@/hooks/useActingPartyUserId";

// Mock Convex React hooks
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("../../convex/_generated/api", () => ({
  api: {
    cases: { get: "cases:get", partyStates: "cases:partyStates" },
  },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const INITIATOR_USER_ID = "users:initiator_001";
const INVITEE_USER_ID = "users:invitee_002";

const SOLO_CASE_PARTY_STATES = {
  all: [
    { userId: INITIATOR_USER_ID, role: "INITIATOR" },
    { userId: INVITEE_USER_ID, role: "INVITEE" },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper(initialUrl: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
    );
  };
}

// ---------------------------------------------------------------------------
// AC 4: useActingPartyUserId returns correct userId based on ?as param
// ---------------------------------------------------------------------------
describe("AC 4: useActingPartyUserId hook returns correct userId based on toggle state", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue(SOLO_CASE_PARTY_STATES);
  });

  test("useActingPartyUserId is exported as a function", () => {
    expect(useActingPartyUserId).toBeDefined();
    expect(typeof useActingPartyUserId).toBe("function");
  });

  test("returns initiator userId when ?as=initiator", () => {
    const hook = useActingPartyUserId as unknown as (
      caseId: string,
    ) => string | null;

    const { result } = renderHook(() => hook("cases:test_case"), {
      wrapper: createWrapper("/cases/test-case?as=initiator"),
    });

    expect(result.current).toBe(INITIATOR_USER_ID);
  });

  test("returns invitee userId when ?as=invitee", () => {
    const hook = useActingPartyUserId as unknown as (
      caseId: string,
    ) => string | null;

    const { result } = renderHook(() => hook("cases:test_case"), {
      wrapper: createWrapper("/cases/test-case?as=invitee"),
    });

    expect(result.current).toBe(INVITEE_USER_ID);
  });

  test("defaults to initiator userId when ?as param is absent", () => {
    const hook = useActingPartyUserId as unknown as (
      caseId: string,
    ) => string | null;

    const { result } = renderHook(() => hook("cases:test_case"), {
      wrapper: createWrapper("/cases/test-case"),
    });

    expect(result.current).toBe(INITIATOR_USER_ID);
  });
});

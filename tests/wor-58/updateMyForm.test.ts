/**
 * WOR-58: updateMyForm mutation tests
 *
 * AC1: cases/updateMyForm mutation updates the invitee's partyStates form
 *      fields (mainTopic, description, desiredOutcome)
 * AC2: Mutation enforces the caller is a party to the case (via partyStates
 *      lookup and auth check)
 * AC6 (backend): mainTopic is required — empty string yields INVALID_INPUT
 *
 * Tests will FAIL until the implementation exists — correct red state.
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";

// @ts-expect-error WOR-58 red-state import: implementation is created by task-implement.
import { updateMyForm as updateMyFormMutation } from "../../convex/cases/updateMyForm";

// Convex mutation() returns a wrapper with `.handler`. Extract the handler so
// tests can call it directly with a mock context.
const updateMyForm: (
  ctx: unknown,
  args: Record<string, unknown>,
) => Promise<void> =
  typeof updateMyFormMutation === "object" &&
  updateMyFormMutation !== null &&
  "handler" in (updateMyFormMutation as Record<string, unknown>)
    ? (updateMyFormMutation as unknown as { handler: (...a: unknown[]) => Promise<void> }).handler
    : (updateMyFormMutation as (ctx: unknown, args: Record<string, unknown>) => Promise<void>);

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const USER_ID = "user_invitee" as string;
const CASE_ID = "case_1" as string;

const VALID_ARGS = {
  caseId: CASE_ID,
  mainTopic: "We need to discuss the budget allocation",
  description: "I feel the budget split is unfair.",
  desiredOutcome: "Agree on a fair 50/50 split.",
};

// ---------------------------------------------------------------------------
// Mock Convex context builder
// ---------------------------------------------------------------------------

interface PatchedDoc {
  id: string;
  fields: Record<string, unknown>;
}

function createMockContext(options?: {
  authenticated?: boolean;
  hasPartyState?: boolean;
  privateCoachingCompletedAt?: number | null;
}) {
  const authenticated = options?.authenticated ?? true;
  const hasPartyState = options?.hasPartyState ?? true;
  const coachingCompleted = options?.privateCoachingCompletedAt ?? null;

  const patched: PatchedDoc[] = [];

  const partyStateId = "ps_invitee_1";
  const partyStateRow = hasPartyState
    ? {
        _id: partyStateId,
        caseId: CASE_ID,
        userId: USER_ID,
        role: "INVITEE" as const,
        mainTopic: null,
        description: null,
        desiredOutcome: null,
        formCompletedAt: null,
        privateCoachingCompletedAt: coachingCompleted,
      }
    : null;

  const mockUser = {
    _id: USER_ID,
    email: "invitee@example.com",
    role: "USER" as const,
    createdAt: Date.now(),
  };

  const ctx = {
    auth: {
      getUserIdentity: async () =>
        authenticated
          ? {
              email: "invitee@example.com",
              subject: `${USER_ID}|session-1`,
              tokenIdentifier: `${USER_ID}|session-1`,
            }
          : null,
    },
    db: {
      get: async (id: string) => {
        if (id === USER_ID) return mockUser;
        return null;
      },
      query: (table: string) => ({
        withIndex: (_name: string, _pred: (q: unknown) => unknown) => ({
          first: async () => {
            if (table === "users") return mockUser;
            if (table === "partyStates") return partyStateRow;
            return null;
          },
          collect: async () => {
            if (table === "partyStates" && partyStateRow) {
              return [partyStateRow];
            }
            return [];
          },
        }),
      }),
      patch: async (id: string, fields: Record<string, unknown>) => {
        patched.push({ id, fields });
      },
    },
  };

  return { ctx, patched, partyStateId };
}

// ---------------------------------------------------------------------------
// AC1: updateMyForm mutation updates partyStates form fields
// ---------------------------------------------------------------------------
describe("AC1: updateMyForm updates partyStates form fields", () => {
  test("patches partyStates with mainTopic, description, and desiredOutcome", async () => {
    const { ctx, patched, partyStateId } = createMockContext();
    await updateMyForm(ctx, VALID_ARGS);

    expect(patched).toHaveLength(1);
    expect(patched[0].id).toBe(partyStateId);
    expect(patched[0].fields.mainTopic).toBe(VALID_ARGS.mainTopic);
    expect(patched[0].fields.description).toBe(VALID_ARGS.description);
    expect(patched[0].fields.desiredOutcome).toBe(VALID_ARGS.desiredOutcome);
  });

  test("sets formCompletedAt to a timestamp on the partyStates row", async () => {
    const before = Date.now();
    const { ctx, patched } = createMockContext();
    await updateMyForm(ctx, VALID_ARGS);

    const ts = patched[0].fields.formCompletedAt as number;
    expect(typeof ts).toBe("number");
    expect(ts).toBeGreaterThanOrEqual(before);
  });

  test("accepts optional description and desiredOutcome as undefined", async () => {
    const { ctx, patched } = createMockContext();
    await updateMyForm(ctx, {
      caseId: CASE_ID,
      mainTopic: "Budget discussion",
    });

    expect(patched).toHaveLength(1);
    expect(patched[0].fields.mainTopic).toBe("Budget discussion");
  });
});

// ---------------------------------------------------------------------------
// AC2: Mutation enforces party authorization
// ---------------------------------------------------------------------------
describe("AC2: Mutation enforces party authorization", () => {
  test("throws UNAUTHENTICATED when user is not logged in", async () => {
    const { ctx } = createMockContext({ authenticated: false });

    try {
      await updateMyForm(ctx, VALID_ARGS);
      expect.fail("Expected mutation to throw for unauthenticated user");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("UNAUTHENTICATED");
    }
  });

  test("throws FORBIDDEN when user has no partyStates row for the case", async () => {
    const { ctx } = createMockContext({ hasPartyState: false });

    try {
      await updateMyForm(ctx, VALID_ARGS);
      expect.fail("Expected mutation to throw for non-party user");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("FORBIDDEN");
    }
  });

  test("throws FORBIDDEN when privateCoachingCompletedAt is set (form locked)", async () => {
    const { ctx } = createMockContext({
      privateCoachingCompletedAt: Date.now() - 60_000,
    });

    try {
      await updateMyForm(ctx, VALID_ARGS);
      expect.fail("Expected mutation to throw when coaching is completed");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("FORBIDDEN");
    }
  });
});

// ---------------------------------------------------------------------------
// AC6 (backend): mainTopic validation
// ---------------------------------------------------------------------------
describe("AC6: mainTopic is required (backend)", () => {
  test("throws INVALID_INPUT when mainTopic is empty string", async () => {
    const { ctx } = createMockContext();

    try {
      await updateMyForm(ctx, { ...VALID_ARGS, mainTopic: "" });
      expect.fail("Expected mutation to throw for empty mainTopic");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("INVALID_INPUT");
    }
  });

  test("throws INVALID_INPUT when mainTopic is whitespace only", async () => {
    const { ctx } = createMockContext();

    try {
      await updateMyForm(ctx, { ...VALID_ARGS, mainTopic: "   " });
      expect.fail("Expected mutation to throw for whitespace-only mainTopic");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("INVALID_INPUT");
    }
  });
});

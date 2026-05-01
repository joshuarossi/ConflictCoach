/**
 * WOR-33: Dashboard backend — cases/list query tests
 *
 * Tests cover all 6 acceptance criteria for the cases/list Convex query.
 * AC1–AC5 are tested here via Vitest with mocked Convex contexts.
 * AC6 (reactivity) is tested in e2e/wor-33/cases-list-reactive.spec.ts.
 *
 * All tests FAIL until the `list` export is added to convex/cases.ts.
 */
import { describe, test, expect, vi } from "vitest";
import { ConvexError } from "convex/values";

import { list } from "../../convex/cases";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const USER_A_ID = "users:userA" as any;
const USER_B_ID = "users:userB" as any;
const USER_C_ID = "users:userC" as any;
const CASE_1_ID = "cases:case1" as any;
const CASE_2_ID = "cases:case2" as any;
const CASE_3_ID = "cases:case3" as any;
const TV_ID = "templateVersions:tv1" as any;

const userA = {
  _id: USER_A_ID,
  email: "userA@test.com",
  displayName: "Alice",
  role: "USER" as const,
  createdAt: 1000,
};

const userB = {
  _id: USER_B_ID,
  email: "userB@test.com",
  displayName: "Bob",
  role: "USER" as const,
  createdAt: 1001,
};

const userC = {
  _id: USER_C_ID,
  email: "userC@test.com",
  displayName: "Charlie",
  role: "USER" as const,
  createdAt: 1002,
};

/** Case where userA is initiator, userB is invitee. updatedAt=3000. */
const case1 = {
  _id: CASE_1_ID,
  schemaVersion: 1 as const,
  status: "BOTH_PRIVATE_COACHING" as const,
  isSolo: false,
  category: "workplace",
  templateVersionId: TV_ID,
  initiatorUserId: USER_A_ID,
  inviteeUserId: USER_B_ID,
  createdAt: 2000,
  updatedAt: 3000,
};

/** Case where userB is initiator, userA is invitee. updatedAt=4000. */
const case2 = {
  _id: CASE_2_ID,
  schemaVersion: 1 as const,
  status: "DRAFT_PRIVATE_COACHING" as const,
  isSolo: false,
  category: "family",
  templateVersionId: TV_ID,
  initiatorUserId: USER_B_ID,
  inviteeUserId: USER_A_ID,
  createdAt: 2001,
  updatedAt: 4000,
};

/** Case where userA is initiator, no invitee yet (pre-invite-redemption). updatedAt=5000. */
const case4_noInvitee = {
  _id: "cases:case4" as any,
  schemaVersion: 1 as const,
  status: "DRAFT_PRIVATE_COACHING" as const,
  isSolo: false,
  category: "personal",
  templateVersionId: TV_ID,
  initiatorUserId: USER_A_ID,
  inviteeUserId: undefined,
  createdAt: 2003,
  updatedAt: 5000,
};

/** UserA's party state for Case4 (no invitee case) */
const partyStateAlice_case4 = {
  _id: "partyStates:ps4a" as any,
  caseId: "cases:case4" as any,
  userId: USER_A_ID,
  role: "INITIATOR" as const,
  privateCoachingCompletedAt: undefined,
};

/** Case where userA is neither party. */
const case3 = {
  _id: CASE_3_ID,
  schemaVersion: 1 as const,
  status: "JOINT_ACTIVE" as const,
  isSolo: false,
  category: "personal",
  templateVersionId: TV_ID,
  initiatorUserId: USER_B_ID,
  inviteeUserId: USER_C_ID,
  createdAt: 2002,
  updatedAt: 2500,
};

/** Other party's state for Case1 (Bob as invitee) — contains private content */
const partyStateBob_case1 = {
  _id: "partyStates:ps1b" as any,
  caseId: CASE_1_ID,
  userId: USER_B_ID,
  role: "INVITEE" as const,
  mainTopic: "Secret topic about the workplace issue",
  description: "Detailed secret description of the conflict",
  desiredOutcome: "Secret desired resolution",
  formCompletedAt: 2500,
  privateCoachingCompletedAt: 2800,
  synthesisText: "Secret synthesis text for invitee",
  synthesisGeneratedAt: 2900,
};

/** Other party's state for Case2 (Bob as initiator) — no coaching completed */
const partyStateBob_case2 = {
  _id: "partyStates:ps2b" as any,
  caseId: CASE_2_ID,
  userId: USER_B_ID,
  role: "INITIATOR" as const,
  mainTopic: "Bob secret topic",
  description: "Bob secret description",
  desiredOutcome: "Bob secret outcome",
  formCompletedAt: 2600,
  privateCoachingCompletedAt: undefined,
  synthesisText: undefined,
  synthesisGeneratedAt: undefined,
};

/** UserA's party state for Case1 */
const partyStateAlice_case1 = {
  _id: "partyStates:ps1a" as any,
  caseId: CASE_1_ID,
  userId: USER_A_ID,
  role: "INITIATOR" as const,
  privateCoachingCompletedAt: 2700,
};

/** UserA's party state for Case2 */
const partyStateAlice_case2 = {
  _id: "partyStates:ps2a" as any,
  caseId: CASE_2_ID,
  userId: USER_A_ID,
  role: "INVITEE" as const,
  privateCoachingCompletedAt: undefined,
};

// ---------------------------------------------------------------------------
// Mock Convex context builder
// ---------------------------------------------------------------------------

/**
 * Creates a mock Convex query context that supports:
 * - ctx.auth.getUserIdentity()
 * - ctx.db.get(id)
 * - ctx.db.query(table).withIndex(name, pred).collect() / .first()
 */
function createMockCtx(config: {
  identity: { email: string; subject: string } | null;
  docsById: Record<string, any>;
  tables: Record<string, any[]>;
}) {
  return {
    auth: {
      getUserIdentity: vi
        .fn()
        .mockResolvedValue(config.identity),
    },
    db: {
      get: vi
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve(config.docsById[id] ?? null),
        ),
      query: vi.fn().mockImplementation((table: string) => ({
        withIndex: vi
          .fn()
          .mockImplementation(
            (_name: string, pred?: (q: any) => any) => {
              let rows = config.tables[table] ?? [];
              if (pred) {
                const eqs: Record<string, any> = {};
                const qb: any = {
                  eq(field: string, value: any) {
                    eqs[field] = value;
                    return qb;
                  },
                };
                pred(qb);
                rows = rows.filter((doc: any) =>
                  Object.entries(eqs).every(
                    ([f, val]) => doc[f] === val,
                  ),
                );
              }
              return {
                first: vi.fn().mockResolvedValue(rows[0] ?? null),
                collect: vi.fn().mockResolvedValue([...rows]),
              };
            },
          ),
      })),
    },
  };
}

/** Extracts the callable handler from a Convex function or plain function. */
function getHandler(fn: any): (...args: any[]) => Promise<any> {
  if (typeof fn === "function") return fn;
  if (fn?.handler) return fn.handler;
  throw new Error(
    "Cannot extract handler — list query is not yet implemented",
  );
}

/** Standard context: userA is authenticated, all test data present. */
function createStandardCtx() {
  return createMockCtx({
    identity: { email: userA.email, subject: "auth|userA" },
    docsById: {
      [USER_A_ID]: userA,
      [USER_B_ID]: userB,
      [USER_C_ID]: userC,
      [CASE_1_ID]: case1,
      [CASE_2_ID]: case2,
      [CASE_3_ID]: case3,
    },
    tables: {
      users: [userA, userB, userC],
      cases: [case1, case2, case3],
      partyStates: [
        partyStateAlice_case1,
        partyStateBob_case1,
        partyStateAlice_case2,
        partyStateBob_case2,
      ],
    },
  });
}

/** Context with a case that has no invitee (pre-invite-redemption). */
function createNoInviteeCtx() {
  return createMockCtx({
    identity: { email: userA.email, subject: "auth|userA" },
    docsById: {
      [USER_A_ID]: userA,
      [case4_noInvitee._id]: case4_noInvitee,
    },
    tables: {
      users: [userA],
      cases: [case4_noInvitee],
      partyStates: [partyStateAlice_case4],
    },
  });
}

// ---------------------------------------------------------------------------
// AC 1: cases/list returns cases where user is initiatorUserId OR inviteeUserId
// ---------------------------------------------------------------------------
describe("AC1: cases/list returns cases for initiator OR invitee", () => {
  test("list query is exported from convex/cases", () => {
    expect(list).toBeDefined();
  });

  test("returns case where authenticated user is initiator", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    expect(Array.isArray(result)).toBe(true);
    const ids = result.map((r: any) => r._id ?? r.id);
    expect(ids).toContain(CASE_1_ID);
  });

  test("returns case where authenticated user is invitee", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    const ids = result.map((r: any) => r._id ?? r.id);
    expect(ids).toContain(CASE_2_ID);
  });

  test("returns both cases when user participates in multiple", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    const ids = result.map((r: any) => r._id ?? r.id);
    expect(ids).toContain(CASE_1_ID);
    expect(ids).toContain(CASE_2_ID);
    expect(result).toHaveLength(2);
  });

  test("excludes cases where user is neither party", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    const ids = result.map((r: any) => r._id ?? r.id);
    expect(ids).not.toContain(CASE_3_ID);
  });

  test("returns case where inviteeUserId is undefined (pre-invite-redemption)", async () => {
    const ctx = createNoInviteeCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    expect(Array.isArray(result)).toBe(true);
    const caseItem = result.find(
      (r: any) => (r._id ?? r.id) === case4_noInvitee._id,
    );
    // Case must be returned for the initiator even without an invitee
    expect(caseItem).toBeDefined();

    // displayName should be a fallback value (empty string, placeholder, etc.) — not crash
    const displayName =
      caseItem.otherPartyDisplayName ??
      caseItem.otherPartyName ??
      caseItem.displayName;
    expect(displayName).toBeDefined();
    expect(typeof displayName).toBe("string");

    // hasCompletedPC must be false when there is no invitee
    const hasPC =
      caseItem.hasCompletedPC ??
      caseItem.otherPartyHasCompletedPC ??
      caseItem.otherPhaseOnly?.hasCompletedPC;
    expect(hasPC).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC 2: Each case includes id, status, category, createdAt, updatedAt,
//        other party's displayName, isSolo flag
// ---------------------------------------------------------------------------
describe("AC2: Each case includes required fields", () => {
  test("returned items include id, status, category, createdAt, updatedAt, isSolo, and other party displayName", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      // id — Convex convention is _id, but accept either
      expect(item._id ?? item.id).toBeDefined();
      expect(item.status).toBeDefined();
      expect(item.category).toBeDefined();
      expect(typeof item.createdAt).toBe("number");
      expect(typeof item.updatedAt).toBe("number");
      expect(typeof item.isSolo).toBe("boolean");

      // Other party's display name (flexible field name)
      const displayName =
        item.otherPartyDisplayName ??
        item.otherPartyName ??
        item.displayName;
      expect(typeof displayName).toBe("string");
      expect(displayName.length).toBeGreaterThan(0);
    }
  });

  test("other party displayName resolves to the correct user", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    // For case1: userA is initiator, other party is Bob
    const case1Item = result.find(
      (r: any) => (r._id ?? r.id) === CASE_1_ID,
    );
    const case1Name =
      case1Item.otherPartyDisplayName ??
      case1Item.otherPartyName ??
      case1Item.displayName;
    expect(case1Name).toBe("Bob");

    // For case2: userA is invitee, other party is also Bob (initiator)
    const case2Item = result.find(
      (r: any) => (r._id ?? r.id) === CASE_2_ID,
    );
    const case2Name =
      case2Item.otherPartyDisplayName ??
      case2Item.otherPartyName ??
      case2Item.displayName;
    expect(case2Name).toBe("Bob");
  });
});

// ---------------------------------------------------------------------------
// AC 3: Other party's private content is never included —
//        only phase-level status (hasCompletedPC boolean)
// ---------------------------------------------------------------------------
describe("AC3: No private content exposed — only hasCompletedPC", () => {
  test("response items do not contain private partyState fields", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    const privateFields = [
      "description",
      "desiredOutcome",
      "synthesisText",
      "mainTopic",
    ];

    for (const item of result) {
      for (const field of privateFields) {
        expect(item).not.toHaveProperty(field);
      }
      // Verify stringified output does not contain private content values
      const json = JSON.stringify(item);
      expect(json).not.toContain("Secret");
    }
  });

  test("hasCompletedPC boolean is present for other party", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    expect(result.length).toBeGreaterThan(0);
    for (const item of result) {
      // Accept flexible field naming
      const hasPC =
        item.hasCompletedPC ??
        item.otherPartyHasCompletedPC ??
        item.otherPhaseOnly?.hasCompletedPC;
      expect(typeof hasPC).toBe("boolean");
    }
  });

  test("hasCompletedPC is true when other party has privateCoachingCompletedAt", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    // Case1: Bob has privateCoachingCompletedAt=2800 → hasCompletedPC=true
    const case1Item = result.find(
      (r: any) => (r._id ?? r.id) === CASE_1_ID,
    );
    expect(case1Item).toBeDefined();
    const pc1 =
      case1Item.hasCompletedPC ??
      case1Item.otherPartyHasCompletedPC ??
      case1Item.otherPhaseOnly?.hasCompletedPC;
    expect(pc1).toBe(true);
  });

  test("hasCompletedPC is false when other party has no privateCoachingCompletedAt", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    // Case2: Bob has privateCoachingCompletedAt=undefined → hasCompletedPC=false
    const case2Item = result.find(
      (r: any) => (r._id ?? r.id) === CASE_2_ID,
    );
    expect(case2Item).toBeDefined();
    const pc2 =
      case2Item.hasCompletedPC ??
      case2Item.otherPartyHasCompletedPC ??
      case2Item.otherPhaseOnly?.hasCompletedPC;
    expect(pc2).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC 4: Results sorted by updatedAt descending
// ---------------------------------------------------------------------------
describe("AC4: Results sorted by updatedAt descending", () => {
  test("cases are returned in descending updatedAt order", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    expect(result.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].updatedAt).toBeGreaterThanOrEqual(
        result[i].updatedAt,
      );
    }
  });

  test("case with highest updatedAt appears first", async () => {
    const ctx = createStandardCtx();
    const handler = getHandler(list);
    const result = await handler(ctx, {});

    // case2.updatedAt=4000 > case1.updatedAt=3000
    expect(result[0]._id ?? result[0].id).toBe(CASE_2_ID);
    expect(result[1]._id ?? result[1].id).toBe(CASE_1_ID);
  });
});

// ---------------------------------------------------------------------------
// AC 5: Query requires authentication; unauthenticated calls throw
// ---------------------------------------------------------------------------
describe("AC5: Query requires authentication", () => {
  test("throws UNAUTHENTICATED error when no identity is present", async () => {
    const ctx = createMockCtx({
      identity: null,
      docsById: {},
      tables: {},
    });
    const handler = getHandler(list);

    try {
      await handler(ctx, {});
      // If we reach here, the handler didn't throw — fail the test
      expect.unreachable("Expected handler to throw UNAUTHENTICATED");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("UNAUTHENTICATED");
    }
  });

  test("throws UNAUTHENTICATED error when identity has no email", async () => {
    const ctx = createMockCtx({
      identity: { email: "", subject: "auth|noEmail" } as any,
      docsById: {},
      tables: {},
    });
    // Override getUserIdentity to return identity without email
    ctx.auth.getUserIdentity.mockResolvedValue({ subject: "auth|noEmail" });
    const handler = getHandler(list);

    try {
      await handler(ctx, {});
      expect.unreachable("Expected handler to throw UNAUTHENTICATED");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("UNAUTHENTICATED");
    }
  });
});

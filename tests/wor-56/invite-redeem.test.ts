/**
 * Tests for the invites/redeem mutation (WOR-56)
 *
 * Covers all 7 acceptance criteria for invite redemption backend.
 * Tests will FAIL until the implementation exists (red state).
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";

import { redeem as redeemMutation } from "../../convex/invites/redeem";

// Convex mutation() returns a wrapper object whose `.handler` holds the actual
// async function. Extract it so tests can call the handler directly with a
// mock context. The fallback covers the case where module doesn't exist yet.
const redeem: (ctx: unknown, args: Record<string, unknown>) => Promise<any> =
  redeemMutation &&
  typeof redeemMutation === "object" &&
  "handler" in (redeemMutation as Record<string, unknown>)
    ? (redeemMutation as unknown as { handler: (...a: any[]) => any }).handler
    : (redeemMutation as any);

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const USER_A_ID = "user_a_id" as string; // initiator
const USER_B_ID = "user_b_id" as string; // invitee (redeemer)
const USER_C_ID = "user_c_id" as string; // third user for re-redemption test
const CASE_ID = "case_1" as string;
const TOKEN_ID = "token_1" as string;
const TEMPLATE_VERSION_ID = "tv_id" as string;
const VALID_TOKEN = "abc123def456ghi789jkl012mno345pq";

// ---------------------------------------------------------------------------
// Mock users
// ---------------------------------------------------------------------------

const USER_A = {
  _id: USER_A_ID,
  email: "alice@example.com",
  role: "USER" as const,
  createdAt: 1000,
};

const USER_B = {
  _id: USER_B_ID,
  email: "bob@example.com",
  role: "USER" as const,
  createdAt: 2000,
};

const USER_C = {
  _id: USER_C_ID,
  email: "carol@example.com",
  role: "USER" as const,
  createdAt: 3000,
};

// ---------------------------------------------------------------------------
// Mock case and token factories
// ---------------------------------------------------------------------------

function makeCase(overrides?: Record<string, unknown>) {
  return {
    _id: CASE_ID,
    schemaVersion: 1,
    status: "DRAFT_PRIVATE_COACHING",
    isSolo: false,
    category: "workplace",
    templateVersionId: TEMPLATE_VERSION_ID,
    initiatorUserId: USER_A_ID,
    inviteeUserId: undefined,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeToken(overrides?: Record<string, unknown>) {
  return {
    _id: TOKEN_ID,
    caseId: CASE_ID,
    token: VALID_TOKEN,
    status: "ACTIVE",
    createdAt: 1000,
    consumedAt: undefined,
    consumedByUserId: undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock Convex context builder
// ---------------------------------------------------------------------------

interface InsertedDoc {
  table: string;
  doc: Record<string, unknown>;
  id: string;
}

interface PatchedDoc {
  id: string;
  patch: Record<string, unknown>;
}

interface MockContextOptions {
  /** Which user is the authenticated caller */
  callerUser?: typeof USER_A;
  /** The case document in the DB */
  caseDoc?: ReturnType<typeof makeCase> | null;
  /** The invite token document in the DB */
  tokenDoc?: ReturnType<typeof makeToken> | null;
}

function createMockContext(options: MockContextOptions = {}) {
  const {
    callerUser = USER_B,
    caseDoc = makeCase(),
    tokenDoc = makeToken(),
  } = options;

  const inserted: InsertedDoc[] = [];
  const patched: PatchedDoc[] = [];
  let insertCounter = 0;

  // Store for get-by-id lookups
  const store: Record<string, Record<string, unknown>> = {};
  if (caseDoc) store[caseDoc._id] = caseDoc;
  if (tokenDoc) store[tokenDoc._id] = tokenDoc;
  store[USER_A_ID] = USER_A;
  store[USER_B_ID] = USER_B;
  store[USER_C_ID] = USER_C;

  const ctx = {
    auth: {
      getUserIdentity: async () => ({
        email: callerUser.email,
        subject: `auth|${callerUser._id}`,
        tokenIdentifier: `auth|${callerUser._id}`,
      }),
    },
    db: {
      get: async (id: string) => store[id] ?? null,
      query: (table: string) => ({
        withIndex: (_name: string, pred: (q: unknown) => unknown) => {
          // Capture the predicate's equality filters
          const captured: Record<string, unknown> = {};
          const probe = {
            eq: (field: string, value: unknown) => {
              captured[field] = value;
              return probe;
            },
          };
          try {
            pred(probe);
          } catch {
            /* predicate shape may vary */
          }

          return {
            first: async () => {
              if (table === "users") {
                // Support by_email lookup
                if (captured["email"] === callerUser.email) return callerUser;
                if (captured["email"] === USER_A.email) return USER_A;
                if (captured["email"] === USER_B.email) return USER_B;
                if (captured["email"] === USER_C.email) return USER_C;
                return null;
              }
              if (table === "inviteTokens") {
                // by_token index lookup
                if (tokenDoc && captured["token"] === tokenDoc.token) {
                  return store[tokenDoc._id];
                }
                return null;
              }
              if (table === "partyStates") {
                // by_case_and_user lookup
                return null;
              }
              return null;
            },
            unique: async () => {
              if (
                table === "inviteTokens" &&
                tokenDoc &&
                captured["token"] === tokenDoc.token
              ) {
                return store[tokenDoc._id];
              }
              return null;
            },
            collect: async () => {
              if (table === "inviteTokens" && tokenDoc) {
                return [store[tokenDoc._id]];
              }
              return [];
            },
          };
        },
      }),
      insert: async (table: string, doc: Record<string, unknown>) => {
        insertCounter++;
        const id = `${table}_${insertCounter}`;
        inserted.push({ table, doc, id });
        store[id] = { _id: id, ...doc };
        return id;
      },
      patch: async (id: string, patch: Record<string, unknown>) => {
        patched.push({ id, patch });
        if (store[id]) {
          store[id] = { ...store[id], ...patch };
        }
      },
    },
  };

  return { ctx, inserted, patched, store };
}

/** Helper to get all inserts for a given table */
function insertsFor(inserted: InsertedDoc[], table: string): InsertedDoc[] {
  return inserted.filter((i) => i.table === table);
}

/** Helper to get all patches for a given id */
function patchesFor(patched: PatchedDoc[], id: string): PatchedDoc[] {
  return patched.filter((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// AC 1: Mutation looks up token by inviteTokens.by_token index
// ---------------------------------------------------------------------------
describe("AC1: Token lookup by inviteTokens.by_token index", () => {
  test("resolves the correct case when called with a valid token", async () => {
    const { ctx } = createMockContext();
    const result = await redeem(ctx, { token: VALID_TOKEN });

    expect(result).toBeDefined();
    expect(result.caseId).toBe(CASE_ID);
  });

  test("throws TOKEN_INVALID when token does not exist", async () => {
    const { ctx } = createMockContext({ tokenDoc: null });

    try {
      await redeem(ctx, { token: "nonexistent_token_value_here_xx" });
      expect.fail("Expected mutation to throw for nonexistent token");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("TOKEN_INVALID");
    }
  });
});

// ---------------------------------------------------------------------------
// AC 2: Validates token status is ACTIVE; throws TOKEN_INVALID if CONSUMED
//        or REVOKED
// ---------------------------------------------------------------------------
describe("AC2: Token status validation", () => {
  test("throws TOKEN_INVALID when token status is CONSUMED", async () => {
    const { ctx } = createMockContext({
      tokenDoc: makeToken({ status: "CONSUMED" }),
    });

    try {
      await redeem(ctx, { token: VALID_TOKEN });
      expect.fail("Expected mutation to throw for CONSUMED token");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("TOKEN_INVALID");
    }
  });

  test("throws TOKEN_INVALID when token status is REVOKED", async () => {
    const { ctx } = createMockContext({
      tokenDoc: makeToken({ status: "REVOKED" }),
    });

    try {
      await redeem(ctx, { token: VALID_TOKEN });
      expect.fail("Expected mutation to throw for REVOKED token");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("TOKEN_INVALID");
    }
  });

  test("succeeds when token status is ACTIVE", async () => {
    const { ctx } = createMockContext({
      tokenDoc: makeToken({ status: "ACTIVE" }),
    });

    const result = await redeem(ctx, { token: VALID_TOKEN });
    expect(result).toBeDefined();
    expect(result.caseId).toBe(CASE_ID);
  });
});

// ---------------------------------------------------------------------------
// AC 3: Prevents self-invite: initiator cannot redeem their own case's invite
// ---------------------------------------------------------------------------
describe("AC3: Self-invite prevention", () => {
  test("throws error when initiator tries to redeem their own case invite", async () => {
    const { ctx } = createMockContext({
      callerUser: USER_A, // USER_A is the case initiator
    });

    try {
      await redeem(ctx, { token: VALID_TOKEN });
      expect.fail(
        "Expected mutation to throw when initiator redeems own invite",
      );
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      // Accept either CONFLICT or FORBIDDEN per task spec
      expect(["CONFLICT", "FORBIDDEN"]).toContain(data.code);
    }
  });

  test("succeeds when a different user redeems the invite", async () => {
    const { ctx } = createMockContext({
      callerUser: USER_B, // USER_B is not the initiator
    });

    const result = await redeem(ctx, { token: VALID_TOKEN });
    expect(result).toBeDefined();
    expect(result.caseId).toBe(CASE_ID);
  });
});

// ---------------------------------------------------------------------------
// AC 4: Atomically: sets cases.inviteeUserId, creates partyStates row
//        (role=INVITEE), sets token status=CONSUMED + consumedAt +
//        consumedByUserId
// ---------------------------------------------------------------------------
describe("AC4: Atomic writes on redemption", () => {
  test("sets cases.inviteeUserId to the redeemer", async () => {
    const { ctx, patched } = createMockContext({ callerUser: USER_B });
    await redeem(ctx, { token: VALID_TOKEN });

    const casePatches = patchesFor(patched, CASE_ID);
    expect(casePatches.length).toBeGreaterThanOrEqual(1);

    const inviteePatch = casePatches.find(
      (p) => p.patch.inviteeUserId !== undefined,
    );
    expect(inviteePatch).toBeDefined();
    expect(inviteePatch!.patch.inviteeUserId).toBe(USER_B_ID);
  });

  test("creates a partyStates row with role=INVITEE for the redeemer", async () => {
    const { ctx, inserted } = createMockContext({ callerUser: USER_B });
    await redeem(ctx, { token: VALID_TOKEN });

    const psInserts = insertsFor(inserted, "partyStates");
    expect(psInserts.length).toBeGreaterThanOrEqual(1);

    const inviteeState = psInserts.find((p) => p.doc.role === "INVITEE");
    expect(inviteeState).toBeDefined();
    expect(inviteeState!.doc.userId).toBe(USER_B_ID);
    expect(inviteeState!.doc.caseId).toBe(CASE_ID);
  });

  test("partyStates row has no form fields populated (invitee fills later)", async () => {
    const { ctx, inserted } = createMockContext({ callerUser: USER_B });
    await redeem(ctx, { token: VALID_TOKEN });

    const psInserts = insertsFor(inserted, "partyStates");
    const inviteeState = psInserts.find((p) => p.doc.role === "INVITEE");
    expect(inviteeState).toBeDefined();
    // Form fields should not be set at redemption time
    expect(inviteeState!.doc.mainTopic).toBeUndefined();
    expect(inviteeState!.doc.description).toBeUndefined();
    expect(inviteeState!.doc.desiredOutcome).toBeUndefined();
  });

  test("sets token status to CONSUMED with consumedAt timestamp", async () => {
    const { ctx, patched } = createMockContext({ callerUser: USER_B });
    const before = Date.now();
    await redeem(ctx, { token: VALID_TOKEN });
    const after = Date.now();

    const tokenPatches = patchesFor(patched, TOKEN_ID);
    expect(tokenPatches.length).toBeGreaterThanOrEqual(1);

    const statusPatch = tokenPatches.find((p) => p.patch.status === "CONSUMED");
    expect(statusPatch).toBeDefined();
    expect(statusPatch!.patch.consumedAt).toBeGreaterThanOrEqual(before);
    expect(statusPatch!.patch.consumedAt).toBeLessThanOrEqual(after);
  });

  test("sets consumedByUserId to the redeemer on the token", async () => {
    const { ctx, patched } = createMockContext({ callerUser: USER_B });
    await redeem(ctx, { token: VALID_TOKEN });

    const tokenPatches = patchesFor(patched, TOKEN_ID);
    const statusPatch = tokenPatches.find((p) => p.patch.status === "CONSUMED");
    expect(statusPatch).toBeDefined();
    expect(statusPatch!.patch.consumedByUserId).toBe(USER_B_ID);
  });
});

// ---------------------------------------------------------------------------
// AC 5: Case status transitions from DRAFT_PRIVATE_COACHING to
//        BOTH_PRIVATE_COACHING
// ---------------------------------------------------------------------------
describe("AC5: Case status transition", () => {
  test("transitions case status to BOTH_PRIVATE_COACHING after redemption", async () => {
    const { ctx, patched } = createMockContext({
      callerUser: USER_B,
      caseDoc: makeCase({ status: "DRAFT_PRIVATE_COACHING" }),
    });
    await redeem(ctx, { token: VALID_TOKEN });

    const casePatches = patchesFor(patched, CASE_ID);
    const statusPatch = casePatches.find((p) => p.patch.status !== undefined);
    expect(statusPatch).toBeDefined();
    expect(statusPatch!.patch.status).toBe("BOTH_PRIVATE_COACHING");
  });

  test("throws error when case is already in BOTH_PRIVATE_COACHING", async () => {
    const { ctx } = createMockContext({
      callerUser: USER_B,
      caseDoc: makeCase({ status: "BOTH_PRIVATE_COACHING" }),
    });

    try {
      await redeem(ctx, { token: VALID_TOKEN });
      expect.fail("Expected mutation to throw when case is already past DRAFT");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("CONFLICT");
    }
  });
});

// ---------------------------------------------------------------------------
// AC 6: Returns { caseId } on success
// ---------------------------------------------------------------------------
describe("AC6: Return value", () => {
  test("returns an object with caseId matching the token's associated case", async () => {
    const { ctx } = createMockContext({ callerUser: USER_B });
    const result = await redeem(ctx, { token: VALID_TOKEN });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("caseId");
    expect(result.caseId).toBe(CASE_ID);
  });

  test("return value caseId is a non-empty string", async () => {
    const { ctx } = createMockContext({ callerUser: USER_B });
    const result = await redeem(ctx, { token: VALID_TOKEN });

    expect(typeof result.caseId).toBe("string");
    expect(result.caseId.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// AC 7: Re-redemption of consumed token fails with TOKEN_INVALID error
// ---------------------------------------------------------------------------
describe("AC7: Re-redemption prevention", () => {
  test("second redemption of same token fails with TOKEN_INVALID", async () => {
    // First redemption succeeds — then the token status in store becomes CONSUMED
    const { ctx, store } = createMockContext({ callerUser: USER_B });
    await redeem(ctx, { token: VALID_TOKEN });

    // After first redemption the store should reflect CONSUMED status
    // (either via patched mock or direct store mutation).
    // Ensure the token is now CONSUMED for the second attempt.
    if (store[TOKEN_ID]) {
      store[TOKEN_ID].status = "CONSUMED";
    }

    // Second redemption by a different user should fail
    // Override the auth to be USER_C
    ctx.auth.getUserIdentity = async () => ({
      email: USER_C.email,
      subject: `auth|${USER_C_ID}`,
      tokenIdentifier: `auth|${USER_C_ID}`,
    });

    try {
      await redeem(ctx, { token: VALID_TOKEN });
      expect.fail("Expected mutation to throw TOKEN_INVALID on re-redemption");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("TOKEN_INVALID");
    }
  });

  test("re-redemption with CONSUMED token throws even for the original redeemer", async () => {
    const { ctx } = createMockContext({
      callerUser: USER_B,
      tokenDoc: makeToken({
        status: "CONSUMED",
        consumedAt: Date.now(),
        consumedByUserId: USER_B_ID,
      }),
    });

    try {
      await redeem(ctx, { token: VALID_TOKEN });
      expect.fail(
        "Expected mutation to throw TOKEN_INVALID for already-consumed token",
      );
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("TOKEN_INVALID");
    }
  });
});

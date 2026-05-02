/**
 * Tests for WOR-50: Draft Coach session lifecycle
 *
 * Covers acceptance criteria:
 * - AC1: startSession creates ACTIVE draftSession
 * - AC2: sendMessage inserts draftMessage + schedules generateResponse
 * - AC5: sendFinalDraft — send gate posts to joint chat, marks SENT
 * - AC6: discardSession marks DISCARDED, no joint message
 * - AC7: session query returns only caller's session, enforces auth
 *
 * These tests exercise the Convex mutation/query/action handlers using
 * a lightweight mock of the Convex runtime context. The mocked ctx
 * simulates db reads/writes, auth, and scheduler behavior.
 */
import { describe, test, expect, vi } from "vitest";
import {
  startSession as startSessionDef,
  sendMessage as sendMessageDef,
  sendFinalDraft as sendFinalDraftDef,
  discardSession as discardSessionDef,
  session as sessionDef,
} from "../../convex/draftCoach";

// Convex mutation()/query() return RegisteredMutation/RegisteredQuery
// objects.  In Vitest the underlying handler is reachable either as the
// callable itself or via the `.handler` / `._handler` properties depending
// on Convex version.  Resolve to a callable shape that always works.
interface ConvexFn {
  handler: (ctx: unknown, args: Record<string, unknown>) => Promise<unknown>;
}
function asCallable(fn: unknown): ConvexFn {
  const anyFn = fn as { handler?: unknown; _handler?: unknown };
  if (typeof anyFn === "function") {
    return { handler: anyFn as ConvexFn["handler"] };
  }
  if (typeof anyFn?.handler === "function") {
    return { handler: anyFn.handler as ConvexFn["handler"] };
  }
  if (typeof anyFn?._handler === "function") {
    return { handler: anyFn._handler as ConvexFn["handler"] };
  }
  throw new Error(
    "Could not resolve Convex function to a callable handler: " +
      JSON.stringify(Object.keys((fn as object) ?? {})),
  );
}
const startSession = asCallable(startSessionDef);
const sendMessage = asCallable(sendMessageDef);
const sendFinalDraft = asCallable(sendFinalDraftDef);
const discardSession = asCallable(discardSessionDef);
const session = asCallable(sessionDef);

// ---------------------------------------------------------------------------
// Branded Id helpers
// ---------------------------------------------------------------------------

type Id<T extends string> = string & { __tableName: T };

const CASE_ID = "cases:dc_case_001" as Id<"cases">;
const USER_A_ID = "users:dc_user_a" as Id<"users">;
const USER_B_ID = "users:dc_user_b" as Id<"users">;
const SESSION_ID = "draftSessions:dc_session_001" as Id<"draftSessions">;
const MESSAGE_ID = "draftMessages:dc_msg_001" as Id<"draftMessages">;

// ---------------------------------------------------------------------------
// In-memory store & mock context factory
// ---------------------------------------------------------------------------

interface MockRow {
  _id: string;
  _creationTime?: number;
  [key: string]: unknown;
}

function createMockCtx(options: {
  userId: Id<"users">;
  rows?: Record<string, MockRow[]>;
}) {
  const store: Record<string, MockRow[]> = options.rows ?? {};
  let insertCounter = 0;

  const scheduledActions: Array<{ ref: unknown; args: unknown }> = [];

  const db = {
    get: vi.fn(async (id: string) => {
      for (const table of Object.values(store)) {
        const row = table.find((r) => r._id === id);
        if (row) return row;
      }
      return null;
    }),
    insert: vi.fn(async (table: string, doc: Record<string, unknown>) => {
      const id = `${table}:mock_${++insertCounter}`;
      if (!store[table]) store[table] = [];
      store[table].push({ _id: id, ...doc });
      return id;
    }),
    patch: vi.fn(async (id: string, updates: Record<string, unknown>) => {
      for (const table of Object.values(store)) {
        const row = table.find((r) => r._id === id);
        if (row) {
          Object.assign(row, updates);
          return;
        }
      }
    }),
    query: vi.fn((table: string) => ({
      withIndex: vi.fn((_indexName: string, predicate?: (q: {
        eq: (field: string, value: unknown) => { eq: (field: string, value: unknown) => unknown };
      }) => unknown) => {
        // Simple query simulation: return rows matching index equality
        return {
          first: vi.fn(async () => {
            const rows = store[table] ?? [];
            if (!predicate) return rows[0] ?? null;
            // For by_case_and_user: match caseId + userId
            // For by_draft_session: match draftSessionId
            // We rely on convention: the predicate calls eq twice for compound indexes
            const eqCalls: Array<{ field: string; value: unknown }> = [];
            const eqProxy = {
              eq: (field: string, value: unknown) => {
                eqCalls.push({ field, value });
                return eqProxy;
              },
            };
            predicate(eqProxy as never);
            return rows.find((r) =>
              eqCalls.every((c) => r[c.field] === c.value),
            ) ?? null;
          }),
          collect: vi.fn(async () => {
            const rows = store[table] ?? [];
            if (!predicate) return rows;
            const eqCalls: Array<{ field: string; value: unknown }> = [];
            const eqProxy = {
              eq: (field: string, value: unknown) => {
                eqCalls.push({ field, value });
                return eqProxy;
              },
            };
            predicate(eqProxy as never);
            return rows.filter((r) =>
              eqCalls.every((c) => r[c.field] === c.value),
            );
          }),
        };
      }),
    })),
  };

  const scheduler = {
    runAfter: vi.fn(async (_delay: number, ref: unknown, args: unknown) => {
      scheduledActions.push({ ref, args });
    }),
  };

  const auth = {
    getUserIdentity: vi.fn(async () => ({
      email: `${options.userId}@test.com`,
      subject: options.userId,
      tokenIdentifier: `token:${options.userId}`,
    } as { email: string; subject: string; tokenIdentifier: string } | null)),
  };

  return { ctx: { db, auth, scheduler }, store, scheduledActions };
}

// ---------------------------------------------------------------------------
// Seed data helpers
// ---------------------------------------------------------------------------

function seedCaseAndParties(
  store: Record<string, MockRow[]>,
  options: {
    caseId?: string;
    userAId?: string;
    userBId?: string;
    caseStatus?: string;
  } = {},
) {
  const caseId = options.caseId ?? CASE_ID;
  const userAId = options.userAId ?? USER_A_ID;
  const userBId = options.userBId ?? USER_B_ID;
  const caseStatus = options.caseStatus ?? "JOINT_ACTIVE";

  store.users = [
    { _id: userAId, email: `${userAId}@test.com`, role: "USER", createdAt: 1000 },
    { _id: userBId, email: `${userBId}@test.com`, role: "USER", createdAt: 1000 },
  ];
  store.cases = [
    {
      _id: caseId,
      schemaVersion: 1,
      status: caseStatus,
      isSolo: false,
      category: "workplace",
      templateVersionId: "templateVersions:tv1",
      initiatorUserId: userAId,
      inviteeUserId: userBId,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];
  store.partyStates = [
    {
      _id: "partyStates:ps_a",
      caseId,
      userId: userAId,
      role: "INITIATOR",
      synthesisText: "User A synthesis",
    },
    {
      _id: "partyStates:ps_b",
      caseId,
      userId: userBId,
      role: "INVITEE",
      synthesisText: "User B synthesis",
    },
  ];
}

// ---------------------------------------------------------------------------
// AC1: startSession
// ---------------------------------------------------------------------------

describe("AC1: startSession creates ACTIVE draft session", () => {
  test("creates a draftSessions row with status=ACTIVE and returns session ID", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);

    const sessionId = await startSession.handler(ctx, { caseId: CASE_ID });

    expect(sessionId).toBeDefined();
    expect(typeof sessionId).toBe("string");

    const inserted = store.draftSessions?.find((r) => r._id === sessionId);
    expect(inserted).toBeDefined();
    expect(inserted?.status).toBe("ACTIVE");
    expect(inserted?.caseId).toBe(CASE_ID);
    expect(inserted?.userId).toBe(USER_A_ID);
  });

  test("rejects unauthenticated caller", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);
    ctx.auth.getUserIdentity.mockResolvedValue(null);

    await expect(
      startSession.handler(ctx, { caseId: CASE_ID }),
    ).rejects.toThrow();
  });

  test("rejects non-party user with FORBIDDEN", async () => {
    const nonPartyId = "users:non_party" as Id<"users">;
    const { ctx, store } = createMockCtx({ userId: nonPartyId });
    seedCaseAndParties(store);
    // Add non-party user to users table but NOT to partyStates
    store.users!.push({
      _id: nonPartyId,
      email: `${nonPartyId}@test.com`,
      role: "USER",
      createdAt: 1000,
    });

    await expect(
      startSession.handler(ctx, { caseId: CASE_ID }),
    ).rejects.toThrow();
  });

  test("rejects if case is not in JOINT_ACTIVE status", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store, { caseStatus: "CLOSED_RESOLVED" });

    await expect(
      startSession.handler(ctx, { caseId: CASE_ID }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC2: sendMessage
// ---------------------------------------------------------------------------

describe("AC2: sendMessage inserts USER message and schedules generateResponse", () => {
  test("inserts a draftMessages row with role=USER", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);
    store.draftSessions = [
      {
        _id: SESSION_ID,
        caseId: CASE_ID,
        userId: USER_A_ID,
        status: "ACTIVE",
        createdAt: 2000,
      },
    ];

    await sendMessage.handler(ctx, {
      sessionId: SESSION_ID,
      content: "Help me phrase my concerns about the budget",
    });

    const inserted = store.draftMessages?.find((r) => r.role === "USER");
    expect(inserted).toBeDefined();
    expect(inserted?.content).toBe("Help me phrase my concerns about the budget");
    expect(inserted?.draftSessionId).toBe(SESSION_ID);
    expect(inserted?.role).toBe("USER");
  });

  test("schedules generateResponse action after message insert", async () => {
    const { ctx, store, scheduledActions } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);
    store.draftSessions = [
      {
        _id: SESSION_ID,
        caseId: CASE_ID,
        userId: USER_A_ID,
        status: "ACTIVE",
        createdAt: 2000,
      },
    ];

    await sendMessage.handler(ctx, {
      sessionId: SESSION_ID,
      content: "How should I express this?",
    });

    expect(scheduledActions.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// AC5: sendFinalDraft — send gate (critical)
// ---------------------------------------------------------------------------

describe("AC5: sendFinalDraft posts to joint chat and marks session SENT", () => {
  test("reads finalDraft and creates a jointMessages row", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);
    store.draftSessions = [
      {
        _id: SESSION_ID,
        caseId: CASE_ID,
        userId: USER_A_ID,
        status: "ACTIVE",
        createdAt: 2000,
        finalDraft: "I'd like to discuss the Q3 budget allocation.",
      },
    ];

    await sendFinalDraft.handler(ctx, { sessionId: SESSION_ID });

    // A jointMessages row should have been created with the draft content
    const jointMsg = store.jointMessages?.find(
      (r) => r.content === "I'd like to discuss the Q3 budget allocation.",
    );
    expect(jointMsg).toBeDefined();
    expect(jointMsg?.authorType).toBe("USER");
    expect(jointMsg?.authorUserId).toBe(USER_A_ID);
  });

  test("marks the draftSession status as SENT with completedAt", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);
    store.draftSessions = [
      {
        _id: SESSION_ID,
        caseId: CASE_ID,
        userId: USER_A_ID,
        status: "ACTIVE",
        createdAt: 2000,
        finalDraft: "Here is my polished message.",
      },
    ];

    await sendFinalDraft.handler(ctx, { sessionId: SESSION_ID });

    const session = store.draftSessions?.find((r) => r._id === SESSION_ID);
    expect(session?.status).toBe("SENT");
    expect(session?.completedAt).toBeDefined();
    expect(typeof session?.completedAt).toBe("number");
  });

  test("rejects if no finalDraft is set on the session", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);
    store.draftSessions = [
      {
        _id: SESSION_ID,
        caseId: CASE_ID,
        userId: USER_A_ID,
        status: "ACTIVE",
        createdAt: 2000,
        // No finalDraft
      },
    ];

    await expect(
      sendFinalDraft.handler(ctx, { sessionId: SESSION_ID }),
    ).rejects.toThrow();
  });

  test("rejects if session does not belong to caller", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_B_ID });
    seedCaseAndParties(store);
    store.draftSessions = [
      {
        _id: SESSION_ID,
        caseId: CASE_ID,
        userId: USER_A_ID, // owned by user A
        status: "ACTIVE",
        createdAt: 2000,
        finalDraft: "Stolen draft",
      },
    ];

    await expect(
      sendFinalDraft.handler(ctx, { sessionId: SESSION_ID }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// AC6: discardSession
// ---------------------------------------------------------------------------

describe("AC6: discardSession marks DISCARDED, no joint message sent", () => {
  test("sets status=DISCARDED and completedAt", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);
    store.draftSessions = [
      {
        _id: SESSION_ID,
        caseId: CASE_ID,
        userId: USER_A_ID,
        status: "ACTIVE",
        createdAt: 2000,
      },
    ];

    await discardSession.handler(ctx, { sessionId: SESSION_ID });

    const sess = store.draftSessions?.find((r) => r._id === SESSION_ID);
    expect(sess?.status).toBe("DISCARDED");
    expect(sess?.completedAt).toBeDefined();
    expect(typeof sess?.completedAt).toBe("number");
  });

  test("no jointMessages row is created after discard", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);
    store.draftSessions = [
      {
        _id: SESSION_ID,
        caseId: CASE_ID,
        userId: USER_A_ID,
        status: "ACTIVE",
        createdAt: 2000,
        finalDraft: "This draft should not be sent",
      },
    ];

    await discardSession.handler(ctx, { sessionId: SESSION_ID });

    const jointMsgs = store.jointMessages ?? [];
    expect(jointMsgs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// AC7: session query — party-scoped, auth-enforced
// ---------------------------------------------------------------------------

describe("AC7: session query returns caller's session only", () => {
  test("returns the active session and messages for the authenticated caller", async () => {
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);
    store.draftSessions = [
      {
        _id: SESSION_ID,
        caseId: CASE_ID,
        userId: USER_A_ID,
        status: "ACTIVE",
        createdAt: 2000,
      },
    ];
    store.draftMessages = [
      {
        _id: MESSAGE_ID,
        draftSessionId: SESSION_ID,
        role: "USER",
        content: "Help me draft something",
        status: "COMPLETE",
        createdAt: 2001,
      },
    ];

    const result = await session.handler(ctx, { caseId: CASE_ID }) as {
      session: MockRow | null;
      messages: MockRow[];
    };

    expect(result).toBeDefined();
    expect(result.session?._id).toBe(SESSION_ID);
    expect(result.messages).toBeDefined();
    expect(result.messages.length).toBeGreaterThanOrEqual(1);
  });

  test("does NOT return another user's session", async () => {
    const otherSessionId = "draftSessions:other_session" as Id<"draftSessions">;
    const { ctx, store } = createMockCtx({ userId: USER_A_ID });
    seedCaseAndParties(store);
    store.draftSessions = [
      {
        _id: otherSessionId,
        caseId: CASE_ID,
        userId: USER_B_ID, // belongs to user B
        status: "ACTIVE",
        createdAt: 2000,
      },
    ];

    const result = await session.handler(ctx, { caseId: CASE_ID }) as {
      session: MockRow | null;
    };

    // User A should not see user B's session
    expect(result.session).toBeNull();
  });

  test("rejects non-party user", async () => {
    const nonPartyId = "users:outsider" as Id<"users">;
    const { ctx, store } = createMockCtx({ userId: nonPartyId });
    seedCaseAndParties(store);
    store.users!.push({
      _id: nonPartyId,
      email: `${nonPartyId}@test.com`,
      role: "USER",
      createdAt: 1000,
    });

    await expect(
      session.handler(ctx, { caseId: CASE_ID }),
    ).rejects.toThrow();
  });
});

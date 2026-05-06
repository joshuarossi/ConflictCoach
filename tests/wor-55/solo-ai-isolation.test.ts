/**
 * Tests for WOR-55 AC6: AI generates separate private coaching responses
 * for each party context. In solo mode, even though both parties are the
 * same real user, the AI should see separate conversation histories.
 *
 * This tests the data-layer isolation that ensures the AI context assembly
 * respects the acting party userId from the toggle, not the real auth user.
 */
import { describe, test, expect, vi } from "vitest";

import {
  myMessages,
  sendUserMessage,
} from "../../convex/privateCoaching";

// ---------------------------------------------------------------------------
// Convex handler resolution utility
// ---------------------------------------------------------------------------

function asCallable(fn: unknown): { handler: (ctx: any, args: any) => Promise<any> } {
  const anyFn = fn as any;
  if (typeof anyFn === "function") {
    return { handler: anyFn };
  }
  if (typeof anyFn?.handler === "function") {
    return { handler: anyFn.handler };
  }
  if (typeof anyFn?._handler === "function") {
    return { handler: anyFn._handler };
  }
  throw new Error(
    "Could not resolve Convex function to a callable handler: " +
      JSON.stringify(Object.keys((fn as object) ?? {})),
  );
}

const myMessagesFn = asCallable(myMessages);
const sendUserMessageFn = asCallable(sendUserMessage);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// In solo mode, both party states reference the same real user, but the
// useActingPartyUserId hook provides different userIds for context.
const REAL_USER_ID = "users:solo_user" as any;
const CASE_ID = "cases:solo_case_001" as any;

const soloCaseDoc = {
  _id: CASE_ID,
  schemaVersion: 1 as const,
  status: "BOTH_PRIVATE_COACHING" as const,
  isSolo: true,
  category: "workplace",
  templateVersionId: "templateVersions:tv_001" as any,
  initiatorUserId: REAL_USER_ID,
  inviteeUserId: REAL_USER_ID,
  createdAt: 900,
  updatedAt: 950,
};

// Party states for solo mode — same real user but different roles
const initiatorPartyState = {
  _id: "partyStates:ps_init" as any,
  caseId: CASE_ID,
  userId: REAL_USER_ID,
  role: "INITIATOR" as const,
  mainTopic: "Communication breakdown",
};

const inviteePartyState = {
  _id: "partyStates:ps_inv" as any,
  caseId: CASE_ID,
  userId: REAL_USER_ID,
  role: "INVITEE" as const,
  mainTopic: "Communication breakdown",
};

// Messages sent under each party context
const initiatorMessages = [
  {
    _id: "privateMessages:msg_init_1" as any,
    caseId: CASE_ID,
    userId: REAL_USER_ID,
    partyRole: "INITIATOR",
    role: "USER" as const,
    content: "I feel like my opinions are dismissed.",
    status: "COMPLETE" as const,
    createdAt: 1000,
  },
];

const inviteeMessages = [
  {
    _id: "privateMessages:msg_inv_1" as any,
    caseId: CASE_ID,
    userId: REAL_USER_ID,
    partyRole: "INVITEE",
    role: "USER" as const,
    content: "They never listen to my design input.",
    status: "COMPLETE" as const,
    createdAt: 1001,
  },
];

// ---------------------------------------------------------------------------
// Mock context
// ---------------------------------------------------------------------------

function createMockQueryCtx(options: {
  authenticatedUserId?: string | null;
  dbData?: Record<string, any[]>;
}) {
  const { authenticatedUserId = null, dbData = {} } = options;
  const email = authenticatedUserId ? `${authenticatedUserId}@test.local` : null;
  const seededUsers = [...(dbData.users ?? [])];
  if (authenticatedUserId && !seededUsers.some((u) => u._id === authenticatedUserId)) {
    seededUsers.push({ _id: authenticatedUserId, email, role: "USER", createdAt: 0 });
  }
  const effectiveDb: Record<string, any[]> = { ...dbData, users: seededUsers };

  function buildIndexedQuery(rows: any[]) {
    return (_indexName: string, predicate?: (q: any) => unknown) => {
      const filters: Array<{ field: string; value: any }> = [];
      if (typeof predicate === "function") {
        const eqFn = (field: string, value: any) => {
          filters.push({ field, value });
          return { eq: eqFn };
        };
        try {
          predicate({ eq: eqFn });
        } catch {
          /* ignore */
        }
      }
      const matched = filters.length
        ? rows.filter((r) => filters.every((f) => r[f.field] === f.value))
        : rows;
      return {
        collect: vi.fn(async () => matched),
        first: vi.fn(async () => matched[0] ?? null),
        filter: vi.fn(() => ({
          collect: vi.fn(async () => matched),
        })),
      };
    };
  }

  return {
    auth: {
      getUserIdentity: vi.fn(async () =>
        authenticatedUserId
          ? { subject: authenticatedUserId, email, tokenIdentifier: `token:${authenticatedUserId}` }
          : null,
      ),
    },
    db: {
      query: vi.fn((table: string) => {
        const rows = effectiveDb[table] ?? [];
        return {
          withIndex: vi.fn(buildIndexedQuery(rows)),
          collect: vi.fn(async () => rows),
          filter: vi.fn(() => ({
            collect: vi.fn(async () => rows),
          })),
        };
      }),
      get: vi.fn(async (id: string) => {
        for (const rows of Object.values(effectiveDb)) {
          const found = (rows as any[]).find((r: any) => r._id === id);
          if (found) return found;
        }
        return null;
      }),
    },
  };
}

// ---------------------------------------------------------------------------
// AC 6: AI context isolation in solo mode
// ---------------------------------------------------------------------------
describe("AC 6: AI generates separate private coaching responses for each party context", () => {
  test("myMessages in a solo case returns messages filtered by acting party role context", async () => {
    // In solo mode, messages should be partitioned by the acting party context.
    // The query must differentiate between initiator and invitee messages
    // even though both belong to the same userId.
    const allMessages = [...initiatorMessages, ...inviteeMessages];

    const ctxInitiator = createMockQueryCtx({
      authenticatedUserId: REAL_USER_ID,
      dbData: {
        cases: [soloCaseDoc],
        partyStates: [initiatorPartyState, inviteePartyState],
        privateMessages: allMessages,
      },
    });

    const ctxInvitee = createMockQueryCtx({
      authenticatedUserId: REAL_USER_ID,
      dbData: {
        cases: [soloCaseDoc],
        partyStates: [initiatorPartyState, inviteePartyState],
        privateMessages: allMessages,
      },
    });

    const handler = myMessagesFn.handler;

    // Query messages as INITIATOR party context
    const initiatorResult = await handler(ctxInitiator, {
      caseId: CASE_ID,
      partyRole: "INITIATOR",
    });

    // Query messages as INVITEE party context
    const inviteeResult = await handler(ctxInvitee, {
      caseId: CASE_ID,
      partyRole: "INVITEE",
    });

    // Results must be arrays (the query returns message lists)
    expect(Array.isArray(initiatorResult)).toBe(true);
    expect(Array.isArray(inviteeResult)).toBe(true);

    // The two result sets must be disjoint — initiator messages should not
    // appear in invitee results and vice versa. This is the core isolation
    // guarantee for solo mode AC6.
    const initiatorIds = (initiatorResult as any[]).map((m: any) => m._id);
    const inviteeIds = (inviteeResult as any[]).map((m: any) => m._id);

    const overlap = initiatorIds.filter((id: string) => inviteeIds.includes(id));
    expect(overlap).toHaveLength(0);

    // Each set should contain only messages for its respective party role
    for (const msg of initiatorResult as any[]) {
      expect(msg.partyRole).toBe("INITIATOR");
    }
    for (const msg of inviteeResult as any[]) {
      expect(msg.partyRole).toBe("INVITEE");
    }
  });

  test("sendUserMessage in solo mode can create messages for the acting party context", async () => {
    const insertedRows: Array<{ table: string; doc: any }> = [];
    const ctx = {
      ...createMockQueryCtx({
        authenticatedUserId: REAL_USER_ID,
        dbData: {
          cases: [soloCaseDoc],
          partyStates: [initiatorPartyState, inviteePartyState],
        },
      }),
      db: {
        ...createMockQueryCtx({
          authenticatedUserId: REAL_USER_ID,
          dbData: {
            cases: [soloCaseDoc],
            partyStates: [initiatorPartyState, inviteePartyState],
          },
        }).db,
        insert: vi.fn(async (table: string, doc: any) => {
          insertedRows.push({ table, doc });
          return `${table}:auto_${insertedRows.length}`;
        }),
        patch: vi.fn(async () => {}),
      },
      scheduler: {
        runAfter: vi.fn(async () => {}),
      },
    };

    const handler = sendUserMessageFn.handler;

    // Should be able to send a message in a solo case
    await expect(
      handler(ctx, { caseId: CASE_ID, content: "Solo initiator message" }),
    ).resolves.not.toThrow();

    // Verify a message was inserted
    const msgRow = insertedRows.find((r) => r.table === "privateMessages");
    expect(msgRow).toBeDefined();
    expect(msgRow!.doc.caseId).toBe(CASE_ID);
    expect(msgRow!.doc.userId).toBe(REAL_USER_ID);
  });
});

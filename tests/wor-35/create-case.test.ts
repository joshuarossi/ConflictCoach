/**
 * Tests for the cases/create mutation (WOR-35)
 *
 * Covers all 7 acceptance criteria for case creation backend.
 * Tests will FAIL until the implementation exists (red state).
 */
import { describe, test, expect, beforeEach } from "vitest";
import { ConvexError } from "convex/values";

// @ts-expect-error WOR-35 red-state import: implementation is created by task-implement.
import { create as createMutation } from "../../convex/cases/create";

// Convex mutation() returns a wrapper object whose `.handler` holds the actual
// async function.  Extract it so tests can call the handler directly with a
// mock context.  The fallback (`createMutation`) covers the unlikely case where
// the implementation exports a plain function instead.
const create: (ctx: unknown, args: Record<string, unknown>) => Promise<any> =
  typeof createMutation === "object" &&
  createMutation !== null &&
  "handler" in (createMutation as Record<string, unknown>)
    ? (createMutation as unknown as { handler: (...a: any[]) => any }).handler
    : (createMutation as any);

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const USER_A = "user_a_id" as string;
const TEMPLATE_ID = "template_id" as string;
const TEMPLATE_VERSION_ID = "tv_id" as string;
const SITE_URL = "https://conflictcoach.app";

const VALID_CATEGORIES = [
  "workplace",
  "family",
  "personal",
  "contractual",
  "other",
] as const;

const VALID_INPUT = {
  category: "workplace" as string,
  mainTopic: "Disagreement about project priorities",
  description: "My colleague and I cannot agree on the project direction.",
  desiredOutcome: "Find a compromise that works for both of us.",
};

// ---------------------------------------------------------------------------
// Mock Convex context builder
// ---------------------------------------------------------------------------

interface InsertedDoc {
  table: string;
  doc: Record<string, unknown>;
  id: string;
}

function createMockContext(options?: { isSolo?: boolean }) {
  const inserted: InsertedDoc[] = [];
  let insertCounter = 0;

  const mockUser = {
    _id: USER_A,
    email: "alice@example.com",
    role: "USER" as const,
    createdAt: Date.now(),
  };

  const mockTemplate = {
    _id: TEMPLATE_ID,
    category: "workplace",
    name: "Workplace Conflict Template",
    currentVersionId: TEMPLATE_VERSION_ID,
    archivedAt: undefined,
    createdAt: Date.now(),
    createdByUserId: USER_A,
  };

  const mockTemplateVersion = {
    _id: TEMPLATE_VERSION_ID,
    templateId: TEMPLATE_ID,
    version: 1,
    globalGuidance: "Be empathetic and fair.",
    publishedAt: Date.now(),
    publishedByUserId: USER_A,
  };

  // Simple store for get-by-id lookups
  const store: Record<string, Record<string, unknown>> = {
    [USER_A]: mockUser,
    [TEMPLATE_ID]: mockTemplate,
    [TEMPLATE_VERSION_ID]: mockTemplateVersion,
  };

  const ctx = {
    auth: {
      getUserIdentity: async () => ({
        email: "alice@example.com",
        subject: "auth|123",
        tokenIdentifier: "auth|123",
      }),
    },
    db: {
      get: async (id: string) => store[id] ?? null,
      query: (table: string) => ({
        withIndex: (_name: string, pred: (q: unknown) => unknown) => ({
          first: async () => {
            if (table === "users") return mockUser;
            if (table === "templates") {
              // Capture the category the implementation filters on by running
              // the predicate against a simple equality-recording probe.
              let queriedCategory: string | undefined;
              const probe = {
                eq: (field: string, value: unknown) => {
                  if (field === "category") queriedCategory = value as string;
                  return probe;
                },
              };
              try { pred(probe); } catch { /* predicate shape may vary */ }
              // Only return the template when the queried category matches
              if (queriedCategory !== undefined && queriedCategory !== mockTemplate.category) {
                return null;
              }
              return mockTemplate;
            }
            return null;
          },
          collect: async () => {
            if (table === "partyStates") {
              return inserted
                .filter((i) => i.table === "partyStates")
                .map((i) => ({ _id: i.id, ...i.doc }));
            }
            return [];
          },
        }),
      }),
      insert: async (table: string, doc: Record<string, unknown>) => {
        insertCounter++;
        const id = `${table}_${insertCounter}`;
        inserted.push({ table, doc, id });
        store[id] = { _id: id, ...doc };
        return id;
      },
    },
  };

  // Set SITE_URL env var
  process.env.SITE_URL = SITE_URL;

  return { ctx, inserted, mockUser, mockTemplate, mockTemplateVersion };
}

/** Helper to get all inserts for a given table */
function insertsFor(inserted: InsertedDoc[], table: string): InsertedDoc[] {
  return inserted.filter((i) => i.table === table);
}

// ---------------------------------------------------------------------------
// AC 7: Input validation — category must be one of the valid set; mainTopic
//        is required
// ---------------------------------------------------------------------------
describe("AC7: Input validation", () => {
  test("rejects an invalid category with INVALID_INPUT error", async () => {
    const { ctx } = createMockContext();

    try {
      await create(ctx, { ...VALID_INPUT, category: "invalid" });
      expect.fail("Expected mutation to throw for invalid category");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("INVALID_INPUT");
    }
  });

  test("rejects empty string category with INVALID_INPUT error", async () => {
    const { ctx } = createMockContext();

    try {
      await create(ctx, { ...VALID_INPUT, category: "" });
      expect.fail("Expected mutation to throw for empty category");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("INVALID_INPUT");
    }
  });

  test("rejects missing mainTopic with INVALID_INPUT error", async () => {
    const { ctx } = createMockContext();

    try {
      await create(ctx, { ...VALID_INPUT, mainTopic: "" });
      expect.fail("Expected mutation to throw for empty mainTopic");
    } catch (e) {
      expect(e).toBeInstanceOf(ConvexError);
      const data = (e as ConvexError<{ code: string }>).data;
      expect(data.code).toBe("INVALID_INPUT");
    }
  });

  test("accepts the 'workplace' category (mock template available) without throwing", async () => {
    const { ctx } = createMockContext();
    // "workplace" is the category with an active template in the mock
    const result = await create(ctx, { ...VALID_INPUT, category: "workplace" });
    expect(result).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC 1: Mutation accepts { category, mainTopic, description, desiredOutcome,
//        isSolo? } as input
// ---------------------------------------------------------------------------
describe("AC1: Mutation accepts the correct input shape", () => {
  test("accepts full input with all fields", async () => {
    const { ctx } = createMockContext();
    const result = await create(ctx, {
      ...VALID_INPUT,
      isSolo: false,
    });
    expect(result).toBeDefined();
  });

  test("accepts input without isSolo (optional field)", async () => {
    const { ctx } = createMockContext();
    const result = await create(ctx, VALID_INPUT);
    expect(result).toBeDefined();
  });

  test("accepts input with isSolo=true and returns without inviteUrl", async () => {
    const { ctx } = createMockContext();
    const result = await create(ctx, {
      ...VALID_INPUT,
      isSolo: true,
    });
    expect(result).toBeDefined();
    expect(result).toHaveProperty("caseId");
    expect(result.inviteUrl).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// AC 2: Creates a case row with status=DRAFT_PRIVATE_COACHING,
//        schemaVersion=1, and templateVersionId from the active template
// ---------------------------------------------------------------------------
describe("AC2: Case row creation", () => {
  test("inserts a case with status DRAFT_PRIVATE_COACHING for non-solo", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const caseInserts = insertsFor(inserted, "cases");
    expect(caseInserts).toHaveLength(1);
    expect(caseInserts[0].doc.status).toBe("DRAFT_PRIVATE_COACHING");
  });

  test("inserts a case with schemaVersion=1", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const caseInserts = insertsFor(inserted, "cases");
    expect(caseInserts[0].doc.schemaVersion).toBe(1);
  });

  test("pins templateVersionId from the active template for the category", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const caseInserts = insertsFor(inserted, "cases");
    expect(caseInserts[0].doc.templateVersionId).toBe(TEMPLATE_VERSION_ID);
  });

  test("sets the category on the case row", async () => {
    const { ctx, inserted } = createMockContext();
    // Use "workplace" — the category the mock template is registered for
    await create(ctx, { ...VALID_INPUT, category: "workplace" });

    const caseInserts = insertsFor(inserted, "cases");
    expect(caseInserts[0].doc.category).toBe("workplace");
  });

  test("throws when no template exists for the given category", async () => {
    const { ctx } = createMockContext();
    // "family" has no mock template — the category-aware mock returns null
    try {
      await create(ctx, { ...VALID_INPUT, category: "family" });
      expect.fail("Expected mutation to throw when template is missing for category");
    } catch (e) {
      // The implementation should surface an error (e.g., INVALID_INPUT or
      // a descriptive message) when no active template matches the category.
      expect(e).toBeDefined();
    }
  });

  test("sets initiatorUserId to the authenticated user", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const caseInserts = insertsFor(inserted, "cases");
    expect(caseInserts[0].doc.initiatorUserId).toBe(USER_A);
  });

  test("sets isSolo=false when not specified", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const caseInserts = insertsFor(inserted, "cases");
    expect(caseInserts[0].doc.isSolo).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC 3: Creates a partyStates row for the initiator with role=INITIATOR
//        and form fields populated
// ---------------------------------------------------------------------------
describe("AC3: Initiator partyStates creation", () => {
  test("creates a partyStates row with role=INITIATOR", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const psInserts = insertsFor(inserted, "partyStates");
    const initiator = psInserts.find((p) => p.doc.role === "INITIATOR");
    expect(initiator).toBeDefined();
  });

  test("populates mainTopic from input", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const psInserts = insertsFor(inserted, "partyStates");
    const initiator = psInserts.find((p) => p.doc.role === "INITIATOR");
    expect(initiator!.doc.mainTopic).toBe(VALID_INPUT.mainTopic);
  });

  test("populates description from input", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const psInserts = insertsFor(inserted, "partyStates");
    const initiator = psInserts.find((p) => p.doc.role === "INITIATOR");
    expect(initiator!.doc.description).toBe(VALID_INPUT.description);
  });

  test("populates desiredOutcome from input", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const psInserts = insertsFor(inserted, "partyStates");
    const initiator = psInserts.find((p) => p.doc.role === "INITIATOR");
    expect(initiator!.doc.desiredOutcome).toBe(VALID_INPUT.desiredOutcome);
  });

  test("links partyStates to the created case via caseId", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const caseInserts = insertsFor(inserted, "cases");
    const psInserts = insertsFor(inserted, "partyStates");
    const initiator = psInserts.find((p) => p.doc.role === "INITIATOR");
    expect(initiator!.doc.caseId).toBe(caseInserts[0].id);
  });

  test("sets userId to the authenticated user", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const psInserts = insertsFor(inserted, "partyStates");
    const initiator = psInserts.find((p) => p.doc.role === "INITIATOR");
    expect(initiator!.doc.userId).toBe(USER_A);
  });
});

// ---------------------------------------------------------------------------
// AC 4: Generates a 32-character crypto-random url-safe invite token with
//        status=ACTIVE
// ---------------------------------------------------------------------------
describe("AC4: Invite token generation", () => {
  test("creates an inviteTokens row for non-solo cases", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const tokenInserts = insertsFor(inserted, "inviteTokens");
    expect(tokenInserts).toHaveLength(1);
  });

  test("token is exactly 32 characters long", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const tokenInserts = insertsFor(inserted, "inviteTokens");
    const token = tokenInserts[0].doc.token as string;
    expect(token).toHaveLength(32);
  });

  test("token is url-safe (matches base64url character set)", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const tokenInserts = insertsFor(inserted, "inviteTokens");
    const token = tokenInserts[0].doc.token as string;
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("token has status=ACTIVE", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const tokenInserts = insertsFor(inserted, "inviteTokens");
    expect(tokenInserts[0].doc.status).toBe("ACTIVE");
  });

  test("invite token is linked to the created case via caseId", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, VALID_INPUT);

    const caseInserts = insertsFor(inserted, "cases");
    const tokenInserts = insertsFor(inserted, "inviteTokens");
    expect(tokenInserts[0].doc.caseId).toBe(caseInserts[0].id);
  });
});

// ---------------------------------------------------------------------------
// AC 5: Returns { caseId, inviteUrl } where inviteUrl uses SITE_URL
// ---------------------------------------------------------------------------
describe("AC5: Return value shape", () => {
  test("returns an object with caseId and inviteUrl", async () => {
    const { ctx } = createMockContext();
    const result = await create(ctx, VALID_INPUT);

    expect(result).toHaveProperty("caseId");
    expect(result).toHaveProperty("inviteUrl");
  });

  test("caseId is a non-empty string", async () => {
    const { ctx } = createMockContext();
    const result = await create(ctx, VALID_INPUT);

    expect(typeof result.caseId).toBe("string");
    expect(result.caseId.length).toBeGreaterThan(0);
  });

  test("inviteUrl starts with SITE_URL", async () => {
    const { ctx } = createMockContext();
    const result = await create(ctx, VALID_INPUT);

    expect(result.inviteUrl).toMatch(new RegExp(`^${SITE_URL}`));
  });

  test("inviteUrl contains the generated invite token", async () => {
    const { ctx, inserted } = createMockContext();
    const result = await create(ctx, VALID_INPUT);

    const tokenInserts = insertsFor(inserted, "inviteTokens");
    const token = tokenInserts[0].doc.token as string;
    expect(result.inviteUrl).toContain(token);
  });
});

// ---------------------------------------------------------------------------
// AC 6: Solo mode — both partyStates, inviteeUserId = initiator, status =
//        BOTH_PRIVATE_COACHING, no invite token
// ---------------------------------------------------------------------------
describe("AC6: Solo mode", () => {
  test("sets case status to BOTH_PRIVATE_COACHING", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, { ...VALID_INPUT, isSolo: true });

    const caseInserts = insertsFor(inserted, "cases");
    expect(caseInserts[0].doc.status).toBe("BOTH_PRIVATE_COACHING");
  });

  test("sets inviteeUserId to the same user as initiator", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, { ...VALID_INPUT, isSolo: true });

    const caseInserts = insertsFor(inserted, "cases");
    expect(caseInserts[0].doc.inviteeUserId).toBe(USER_A);
  });

  test("creates two partyStates rows (INITIATOR + INVITEE)", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, { ...VALID_INPUT, isSolo: true });

    const psInserts = insertsFor(inserted, "partyStates");
    expect(psInserts).toHaveLength(2);

    const roles = psInserts.map((p) => p.doc.role);
    expect(roles).toContain("INITIATOR");
    expect(roles).toContain("INVITEE");
  });

  test("both partyStates rows reference the same userId", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, { ...VALID_INPUT, isSolo: true });

    const psInserts = insertsFor(inserted, "partyStates");
    for (const ps of psInserts) {
      expect(ps.doc.userId).toBe(USER_A);
    }
  });

  test("does NOT generate an invite token", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, { ...VALID_INPUT, isSolo: true });

    const tokenInserts = insertsFor(inserted, "inviteTokens");
    expect(tokenInserts).toHaveLength(0);
  });

  test("returns caseId but no inviteUrl for solo mode", async () => {
    const { ctx } = createMockContext();
    const result = await create(ctx, { ...VALID_INPUT, isSolo: true });

    expect(typeof result.caseId).toBe("string");
    expect(result.caseId.length).toBeGreaterThan(0);
    // Solo cases must not produce an invite URL since no token is generated
    expect(result.inviteUrl).toBeUndefined();
  });

  test("sets isSolo=true on the case row", async () => {
    const { ctx, inserted } = createMockContext();
    await create(ctx, { ...VALID_INPUT, isSolo: true });

    const caseInserts = insertsFor(inserted, "cases");
    expect(caseInserts[0].doc.isSolo).toBe(true);
  });
});

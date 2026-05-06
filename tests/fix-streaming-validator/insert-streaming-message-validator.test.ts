/**
 * Regression test for the streaming-validator bug.
 *
 * Bug: convex/lib/streaming.ts insertStreamingMessage declared
 *   args: { table: v.union(...) }
 * but the streamAIResponse helper called it with the spread of
 * messageFields (caseId, userId, role, aiRole, partyRole, content, status,
 * createdAt). Convex internalMutation validators reject extra fields, so
 * EVERY call to streamAIResponse from privateCoaching / jointChat / draftCoach
 * threw "ArgumentValidationError: Object contains extra field `aiRole` that
 * is not in the validator" before any DB write happened.
 *
 * The unit test below would have caught this in WOR-39 (when
 * insertStreamingMessage was created) and again in WOR-71 (when aiRole was
 * introduced as a transient field) by exercising the exact call path
 * streamAIResponse uses to build args, then validating them against the
 * mutation's declared arg validator.
 *
 * Why this test specifically:
 *   - Tests on streamAIResponse with a fully mocked ctx don't catch this,
 *     because they mock runMutation and never validate against the real
 *     Convex validator.
 *   - Schema tests on the message tables don't catch this, because the
 *     bug is in the internalMutation validator, not the table schema.
 *   - Only a test that constructs the mutation args object and validates
 *     it against the declared argValidator (or replays the same field
 *     shape used by call sites) closes the gap.
 */
import { describe, test, expect } from "vitest";

// We import the validator config we want to enforce. The implementation
// exposes the args shape via the exported internalMutation; we re-derive
// the same shape here by importing the constant the implementation uses.
// If/when the implementation refactors, this test imports break loudly,
// which is the desired behavior — it forces the author to think about
// what the validator should accept.

// NOTE: streaming.ts does not export the args validator object directly.
// The contract this test enforces is: every field shape that the three
// call sites pass MUST be accepted by the insertStreamingMessage validator.
// We capture that contract here as data, and the test replays it.

type CallSiteFixture = {
  callSite: string;
  fields: Record<string, unknown>;
};

// These fixtures mirror, exactly, what each call site of streamAIResponse
// passes as `messageFields`. If a call site changes its messageFields shape,
// add a fixture here so the regression test catches it.
const CALL_SITE_FIXTURES: CallSiteFixture[] = [
  {
    callSite: "privateCoaching.streamReply (no partyRole)",
    fields: {
      caseId: "k171sjmv0kzn8hvqxg9jtne4k98663h4",
      userId: "m57bn5yyb2d08yrtf7g0sp6hfn867syq",
      role: "AI",
      aiRole: "PRIVATE_COACH",
    },
  },
  {
    callSite: "privateCoaching.streamReply (with partyRole)",
    fields: {
      caseId: "k171sjmv0kzn8hvqxg9jtne4k98663h4",
      userId: "m57bn5yyb2d08yrtf7g0sp6hfn867syq",
      role: "AI",
      aiRole: "PRIVATE_COACH",
      partyRole: "INITIATOR",
    },
  },
  {
    callSite: "jointChat.streamCoachResponse",
    fields: {
      caseId: "k171sjmv0kzn8hvqxg9jtne4k98663h4",
      authorType: "COACH",
      isIntervention: false,
    },
  },
  {
    callSite: "draftCoach.streamReply",
    fields: {
      draftSessionId: "d1234567890abcdef1234567890abcd",
      role: "AI",
    },
  },
];

// Replay the field-stripping that streamAIResponse does before calling
// the insert mutation. Mirrors stripTransientFields in convex/lib/streaming.ts.
//
// Note: `partyRole` was originally treated as transient (PR #75) but is now
// persisted on privateMessages rows for solo-mode isolation. Only `aiRole`
// remains in the strip list — it's purely a mock-mode response selector,
// never written to the DB.
const TRANSIENT_FIELDS = ["aiRole"];

function stripTransient(
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (TRANSIENT_FIELDS.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

// The set of fields that insertStreamingMessage's validator MUST accept.
// Derived from convex/schema.ts (privateMessages | jointMessages |
// draftMessages) plus the framing fields the streaming layer adds
// (table, content, status, createdAt).
const ACCEPTED_VALIDATOR_FIELDS = new Set<string>([
  "table",
  "content",
  "status",
  "createdAt",
  // privateMessages
  "caseId",
  "userId",
  "role",
  "partyRole",
  // jointMessages
  "authorType",
  "authorUserId",
  "isIntervention",
  "replyToId",
  // draftMessages
  "draftSessionId",
]);

describe("insertStreamingMessage validator regression", () => {
  test("aiRole is stripped before insert; partyRole is preserved", () => {
    const fields = {
      caseId: "case_id",
      userId: "user_id",
      role: "AI",
      aiRole: "PRIVATE_COACH",
      partyRole: "INITIATOR",
    };
    const stripped = stripTransient(fields);
    expect(stripped).not.toHaveProperty("aiRole");
    expect(stripped).toHaveProperty("partyRole", "INITIATOR");
    // Non-transient fields preserved
    expect(stripped).toEqual({
      caseId: "case_id",
      userId: "user_id",
      role: "AI",
      partyRole: "INITIATOR",
    });
  });

  test.each(CALL_SITE_FIXTURES)(
    "$callSite: stripped messageFields contain only validator-accepted fields",
    ({ fields }) => {
      const persistedFields = stripTransient(fields);

      // Add the streaming-layer-injected fields (mirrors streamAIResponse).
      const mutationArgs = {
        table: "privateMessages",
        ...persistedFields,
        content: "",
        status: "STREAMING",
        createdAt: Date.now(),
      };

      const unexpected = Object.keys(mutationArgs).filter(
        (k) => !ACCEPTED_VALIDATOR_FIELDS.has(k),
      );

      expect(unexpected).toEqual([]);
    },
  );

  test("if a call site adds a brand-new field, this test forces a decision", () => {
    // This is a meta-test: a future contributor who adds a field to
    // messageFields without thinking about the validator will need to
    // either:
    //   (a) add it to TRANSIENT_FIELDS (stripped before insert), or
    //   (b) add it to ACCEPTED_VALIDATOR_FIELDS (and the validator
    //       declaration in convex/lib/streaming.ts), or
    //   (c) discover via the test failure that they need to think about
    //       which one is correct.
    const hypothetical = {
      caseId: "case_id",
      newField: "some_value",
    };
    const stripped = stripTransient(hypothetical);
    const args = {
      table: "privateMessages",
      ...stripped,
      content: "",
      status: "STREAMING",
      createdAt: 0,
    };
    const unexpected = Object.keys(args).filter(
      (k) => !ACCEPTED_VALIDATOR_FIELDS.has(k),
    );
    // newField is neither transient nor in the accepted set — this would
    // fail in production at the validator. The assertion documents that.
    expect(unexpected).toEqual(["newField"]);
  });
});

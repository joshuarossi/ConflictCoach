import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.resolve(__dirname, "../../convex/schema.ts");

let schemaSource: string;

beforeAll(() => {
  schemaSource = readFileSync(SCHEMA_PATH, "utf-8");
});

describe("AC2: All tables have correct field types and validators", () => {
  const EXPECTED_TABLES = [
    "users",
    "cases",
    "partyStates",
    "privateMessages",
    "jointMessages",
    "draftSessions",
    "draftMessages",
    "inviteTokens",
    "templates",
    "templateVersions",
    "auditLog",
  ] as const;

  test("schema defines exactly 11 tables", () => {
    for (const table of EXPECTED_TABLES) {
      expect(schemaSource).toContain(`${table}: defineTable(`);
    }
    // Count defineTable calls to ensure no extra tables
    const defineTableCount = (schemaSource.match(/defineTable\(/g) || [])
      .length;
    expect(defineTableCount).toBe(11);
  });

  // --- users table ---
  describe("users table", () => {
    test("has email field as v.string()", () => {
      expect(schemaSource).toMatch(
        /users:\s*defineTable\(\{[^}]*email:\s*v\.string\(\)/s,
      );
    });

    test("has displayName field as v.optional(v.string())", () => {
      expect(schemaSource).toMatch(
        /users:\s*defineTable\(\{[^}]*displayName:\s*v\.optional\(v\.string\(\)\)/s,
      );
    });

    test('has role field as v.union(v.literal("USER"), v.literal("ADMIN"))', () => {
      expect(schemaSource).toMatch(
        /users:\s*defineTable\(\{[^}]*role:\s*v\.union\(\s*v\.literal\("USER"\),\s*v\.literal\("ADMIN"\)\)/s,
      );
    });

    test("has createdAt field as v.number()", () => {
      expect(schemaSource).toMatch(
        /users:\s*defineTable\(\{[^}]*createdAt:\s*v\.number\(\)/s,
      );
    });
  });

  // --- cases table ---
  describe("cases table", () => {
    test("has schemaVersion as v.literal(1)", () => {
      expect(schemaSource).toMatch(
        /cases:\s*defineTable\(\{[^}]*schemaVersion:\s*v\.literal\(1\)/s,
      );
    });

    test("has status as a 7-variant union type", () => {
      const caseBlock = schemaSource.match(
        /cases:\s*defineTable\(\{([\s\S]*?)\}\)\s*\./,
      );
      expect(caseBlock).not.toBeNull();
      const block = caseBlock![1];
      const statusVariants = [
        "DRAFT_PRIVATE_COACHING",
        "BOTH_PRIVATE_COACHING",
        "READY_FOR_JOINT",
        "JOINT_ACTIVE",
        "CLOSED_RESOLVED",
        "CLOSED_UNRESOLVED",
        "CLOSED_ABANDONED",
      ];
      for (const variant of statusVariants) {
        expect(block).toContain(`v.literal("${variant}")`);
      }
    });

    test("has isSolo as v.boolean()", () => {
      expect(schemaSource).toMatch(
        /cases:\s*defineTable\(\{[^}]*isSolo:\s*v\.boolean\(\)/s,
      );
    });

    test("has category as v.string()", () => {
      expect(schemaSource).toMatch(
        /cases:\s*defineTable\(\{[^}]*category:\s*v\.string\(\)/s,
      );
    });

    test('has templateVersionId as v.id("templateVersions")', () => {
      expect(schemaSource).toMatch(
        /cases:\s*defineTable\(\{[^}]*templateVersionId:\s*v\.id\("templateVersions"\)/s,
      );
    });

    test('has initiatorUserId as v.id("users")', () => {
      expect(schemaSource).toMatch(
        /cases:\s*defineTable\(\{[^}]*initiatorUserId:\s*v\.id\("users"\)/s,
      );
    });

    test('has inviteeUserId as v.optional(v.id("users"))', () => {
      expect(schemaSource).toMatch(
        /cases:\s*defineTable\(\{[^}]*inviteeUserId:\s*v\.optional\(v\.id\("users"\)\)/s,
      );
    });

    test("has createdAt as v.number()", () => {
      expect(schemaSource).toMatch(
        /cases:\s*defineTable\(\{[^}]*createdAt:\s*v\.number\(\)/s,
      );
    });

    test("has updatedAt as v.number()", () => {
      expect(schemaSource).toMatch(
        /cases:\s*defineTable\(\{[^}]*updatedAt:\s*v\.number\(\)/s,
      );
    });

    test("has closedAt as v.optional(v.number())", () => {
      expect(schemaSource).toMatch(
        /cases:\s*defineTable\(\{[^}]*closedAt:\s*v\.optional\(v\.number\(\)\)/s,
      );
    });

    test("has closureSummary as v.optional(v.string())", () => {
      expect(schemaSource).toMatch(
        /cases:\s*defineTable\(\{[^}]*closureSummary:\s*v\.optional\(v\.string\(\)\)/s,
      );
    });
  });

  // --- partyStates table ---
  describe("partyStates table", () => {
    test('has caseId as v.id("cases")', () => {
      expect(schemaSource).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*caseId:\s*v\.id\("cases"\)/s,
      );
    });

    test('has userId as v.id("users")', () => {
      expect(schemaSource).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*userId:\s*v\.id\("users"\)/s,
      );
    });

    test('has role as v.union(v.literal("INITIATOR"), v.literal("INVITEE"))', () => {
      expect(schemaSource).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*role:\s*v\.union\(\s*v\.literal\("INITIATOR"\),\s*v\.literal\("INVITEE"\)\)/s,
      );
    });

    test("has form fields: mainTopic, description, desiredOutcome as optional strings", () => {
      const block = schemaSource;
      expect(block).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*mainTopic:\s*v\.optional\(v\.string\(\)\)/s,
      );
      expect(block).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*description:\s*v\.optional\(v\.string\(\)\)/s,
      );
      expect(block).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*desiredOutcome:\s*v\.optional\(v\.string\(\)\)/s,
      );
    });

    test("has phase state fields as optional numbers/strings/booleans", () => {
      const block = schemaSource;
      expect(block).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*formCompletedAt:\s*v\.optional\(v\.number\(\)\)/s,
      );
      expect(block).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*privateCoachingCompletedAt:\s*v\.optional\(v\.number\(\)\)/s,
      );
      expect(block).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*synthesisText:\s*v\.optional\(v\.string\(\)\)/s,
      );
      expect(block).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*synthesisGeneratedAt:\s*v\.optional\(v\.number\(\)\)/s,
      );
      expect(block).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*closureProposed:\s*v\.optional\(v\.boolean\(\)\)/s,
      );
      expect(block).toMatch(
        /partyStates:\s*defineTable\(\{[^}]*closureConfirmed:\s*v\.optional\(v\.boolean\(\)\)/s,
      );
    });
  });

  // --- privateMessages table ---
  describe("privateMessages table", () => {
    test("has correct fields: caseId, userId, role, content, status, tokens, createdAt", () => {
      expect(schemaSource).toMatch(
        /privateMessages:\s*defineTable\(\{[^}]*caseId:\s*v\.id\("cases"\)/s,
      );
      expect(schemaSource).toMatch(
        /privateMessages:\s*defineTable\(\{[^}]*userId:\s*v\.id\("users"\)/s,
      );
      expect(schemaSource).toMatch(
        /privateMessages:\s*defineTable\(\{[^}]*role:\s*v\.union\(\s*v\.literal\("USER"\),\s*v\.literal\("AI"\)\)/s,
      );
      expect(schemaSource).toMatch(
        /privateMessages:\s*defineTable\(\{[^}]*content:\s*v\.string\(\)/s,
      );
      expect(schemaSource).toMatch(
        /privateMessages:\s*defineTable\(\{[^}]*status:\s*v\.union\(\s*v\.literal\("STREAMING"\),\s*v\.literal\("COMPLETE"\),\s*v\.literal\("ERROR"\),?\s*\)/s,
      );
      expect(schemaSource).toMatch(
        /privateMessages:\s*defineTable\(\{[^}]*tokens:\s*v\.optional\(v\.number\(\)\)/s,
      );
      expect(schemaSource).toMatch(
        /privateMessages:\s*defineTable\(\{[^}]*createdAt:\s*v\.number\(\)/s,
      );
    });
  });

  // --- jointMessages table ---
  describe("jointMessages table", () => {
    test("has correct fields: caseId, authorType, authorUserId, content, status, isIntervention, replyToId, createdAt", () => {
      expect(schemaSource).toMatch(
        /jointMessages:\s*defineTable\(\{[^}]*caseId:\s*v\.id\("cases"\)/s,
      );
      expect(schemaSource).toMatch(
        /jointMessages:\s*defineTable\(\{[^}]*authorType:\s*v\.union\(\s*v\.literal\("USER"\),\s*v\.literal\("COACH"\)\)/s,
      );
      expect(schemaSource).toMatch(
        /jointMessages:\s*defineTable\(\{[^}]*authorUserId:\s*v\.optional\(v\.id\("users"\)\)/s,
      );
      expect(schemaSource).toMatch(
        /jointMessages:\s*defineTable\(\{[^}]*content:\s*v\.string\(\)/s,
      );
      expect(schemaSource).toMatch(
        /jointMessages:\s*defineTable\(\{[^}]*isIntervention:\s*v\.optional\(v\.boolean\(\)\)/s,
      );
      expect(schemaSource).toMatch(
        /jointMessages:\s*defineTable\(\{[^}]*replyToId:\s*v\.optional\(v\.id\("jointMessages"\)\)/s,
      );
    });
  });

  // --- draftSessions table ---
  describe("draftSessions table", () => {
    test("has correct fields: caseId, userId, status, createdAt, completedAt, finalDraft", () => {
      expect(schemaSource).toMatch(
        /draftSessions:\s*defineTable\(\{[^}]*caseId:\s*v\.id\("cases"\)/s,
      );
      expect(schemaSource).toMatch(
        /draftSessions:\s*defineTable\(\{[^}]*userId:\s*v\.id\("users"\)/s,
      );
      expect(schemaSource).toMatch(
        /draftSessions:\s*defineTable\(\{[^}]*status:\s*v\.union\(\s*v\.literal\("ACTIVE"\),\s*v\.literal\("SENT"\),\s*v\.literal\("DISCARDED"\),?\s*\)/s,
      );
      expect(schemaSource).toMatch(
        /draftSessions:\s*defineTable\(\{[^}]*finalDraft:\s*v\.optional\(v\.string\(\)\)/s,
      );
    });
  });

  // --- draftMessages table ---
  describe("draftMessages table", () => {
    test("has correct fields: draftSessionId, role, content, status, createdAt", () => {
      expect(schemaSource).toMatch(
        /draftMessages:\s*defineTable\(\{[^}]*draftSessionId:\s*v\.id\("draftSessions"\)/s,
      );
      expect(schemaSource).toMatch(
        /draftMessages:\s*defineTable\(\{[^}]*role:\s*v\.union\(\s*v\.literal\("USER"\),\s*v\.literal\("AI"\)\)/s,
      );
      expect(schemaSource).toMatch(
        /draftMessages:\s*defineTable\(\{[^}]*content:\s*v\.string\(\)/s,
      );
    });
  });

  // --- inviteTokens table ---
  describe("inviteTokens table", () => {
    test("has correct fields: caseId, token, status, createdAt, consumedAt, consumedByUserId", () => {
      expect(schemaSource).toMatch(
        /inviteTokens:\s*defineTable\(\{[^}]*caseId:\s*v\.id\("cases"\)/s,
      );
      expect(schemaSource).toMatch(
        /inviteTokens:\s*defineTable\(\{[^}]*token:\s*v\.string\(\)/s,
      );
      expect(schemaSource).toMatch(
        /inviteTokens:\s*defineTable\(\{[^}]*status:\s*v\.union\(\s*v\.literal\("ACTIVE"\),\s*v\.literal\("CONSUMED"\),\s*v\.literal\("REVOKED"\),?\s*\)/s,
      );
      expect(schemaSource).toMatch(
        /inviteTokens:\s*defineTable\(\{[^}]*consumedAt:\s*v\.optional\(v\.number\(\)\)/s,
      );
      expect(schemaSource).toMatch(
        /inviteTokens:\s*defineTable\(\{[^}]*consumedByUserId:\s*v\.optional\(v\.id\("users"\)\)/s,
      );
    });
  });

  // --- templates table ---
  describe("templates table", () => {
    test("has correct fields: category, name, currentVersionId, archivedAt, createdAt, createdByUserId", () => {
      expect(schemaSource).toMatch(
        /templates:\s*defineTable\(\{[^}]*category:\s*v\.string\(\)/s,
      );
      expect(schemaSource).toMatch(
        /templates:\s*defineTable\(\{[^}]*name:\s*v\.string\(\)/s,
      );
      expect(schemaSource).toMatch(
        /templates:\s*defineTable\(\{[^}]*currentVersionId:\s*v\.optional\(v\.id\("templateVersions"\)\)/s,
      );
      expect(schemaSource).toMatch(
        /templates:\s*defineTable\(\{[^}]*archivedAt:\s*v\.optional\(v\.number\(\)\)/s,
      );
      expect(schemaSource).toMatch(
        /templates:\s*defineTable\(\{[^}]*createdByUserId:\s*v\.id\("users"\)/s,
      );
    });
  });

  // --- templateVersions table ---
  describe("templateVersions table", () => {
    test("has correct fields: templateId, version, globalGuidance, coachInstructions, draftCoachInstructions, publishedAt, publishedByUserId, notes", () => {
      expect(schemaSource).toMatch(
        /templateVersions:\s*defineTable\(\{[^}]*templateId:\s*v\.id\("templates"\)/s,
      );
      expect(schemaSource).toMatch(
        /templateVersions:\s*defineTable\(\{[^}]*version:\s*v\.number\(\)/s,
      );
      expect(schemaSource).toMatch(
        /templateVersions:\s*defineTable\(\{[^}]*globalGuidance:\s*v\.string\(\)/s,
      );
      expect(schemaSource).toMatch(
        /templateVersions:\s*defineTable\(\{[^}]*coachInstructions:\s*v\.optional\(v\.string\(\)\)/s,
      );
      expect(schemaSource).toMatch(
        /templateVersions:\s*defineTable\(\{[^}]*draftCoachInstructions:\s*v\.optional\(v\.string\(\)\)/s,
      );
      expect(schemaSource).toMatch(
        /templateVersions:\s*defineTable\(\{[^}]*publishedAt:\s*v\.number\(\)/s,
      );
      expect(schemaSource).toMatch(
        /templateVersions:\s*defineTable\(\{[^}]*publishedByUserId:\s*v\.id\("users"\)/s,
      );
      expect(schemaSource).toMatch(
        /templateVersions:\s*defineTable\(\{[^}]*notes:\s*v\.optional\(v\.string\(\)\)/s,
      );
    });
  });

  // --- auditLog table ---
  describe("auditLog table", () => {
    test("has correct fields: actorUserId, action, targetType, targetId, metadata, createdAt", () => {
      expect(schemaSource).toMatch(
        /auditLog:\s*defineTable\(\{[^}]*actorUserId:\s*v\.id\("users"\)/s,
      );
      expect(schemaSource).toMatch(
        /auditLog:\s*defineTable\(\{[^}]*action:\s*v\.string\(\)/s,
      );
      expect(schemaSource).toMatch(
        /auditLog:\s*defineTable\(\{[^}]*targetType:\s*v\.string\(\)/s,
      );
      expect(schemaSource).toMatch(
        /auditLog:\s*defineTable\(\{[^}]*targetId:\s*v\.string\(\)/s,
      );
      expect(schemaSource).toMatch(
        /auditLog:\s*defineTable\(\{[^}]*metadata:\s*v\.optional\(v\.any\(\)\)/s,
      );
      expect(schemaSource).toMatch(
        /auditLog:\s*defineTable\(\{[^}]*createdAt:\s*v\.number\(\)/s,
      );
    });
  });
});

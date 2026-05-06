import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.resolve(__dirname, "../../convex/schema.ts");

let schemaSource: string;

beforeAll(() => {
  schemaSource = readFileSync(SCHEMA_PATH, "utf-8");
});

describe("AC3: All indexes are defined (by_email, by_initiator, by_invitee, by_case, by_case_and_user, by_token, by_category, by_template, by_actor, by_draft_session)", () => {
  test('users table has index "by_email" on ["email"]', () => {
    expect(schemaSource).toMatch(
      /users:\s*defineTable\([\s\S]*?\.index\("by_email",\s*\["email"\]\)/,
    );
  });

  test('cases table has index "by_initiator" on ["initiatorUserId"]', () => {
    expect(schemaSource).toMatch(
      /cases:\s*defineTable\([\s\S]*?\.index\("by_initiator",\s*\["initiatorUserId"\]\)/,
    );
  });

  test('cases table has index "by_invitee" on ["inviteeUserId"]', () => {
    expect(schemaSource).toMatch(
      /cases:\s*defineTable\([\s\S]*?\.index\("by_invitee",\s*\["inviteeUserId"\]\)/,
    );
  });

  test('partyStates table has index "by_case" on ["caseId"]', () => {
    expect(schemaSource).toMatch(
      /partyStates:\s*defineTable\([\s\S]*?\.index\("by_case",\s*\["caseId"\]\)/,
    );
  });

  test('partyStates table has index "by_case_and_user" on ["caseId", "userId"]', () => {
    expect(schemaSource).toMatch(
      /partyStates:\s*defineTable\([\s\S]*?\.index\("by_case_and_user",\s*\["caseId",\s*"userId"\]\)/,
    );
  });

  test('privateMessages table has index "by_case_and_user" on ["caseId", "userId"]', () => {
    expect(schemaSource).toMatch(
      /privateMessages:\s*defineTable\([\s\S]*?\.index\("by_case_and_user",\s*\["caseId",\s*"userId"\]\)/,
    );
  });

  test('privateMessages table has index "by_case" on ["caseId"]', () => {
    expect(schemaSource).toMatch(
      /privateMessages:\s*defineTable\([\s\S]*?\.index\("by_case",\s*\["caseId"\]\)/,
    );
  });

  test('jointMessages table has index "by_case" on ["caseId"]', () => {
    expect(schemaSource).toMatch(
      /jointMessages:\s*defineTable\([\s\S]*?\.index\("by_case",\s*\["caseId"\]\)/,
    );
  });

  test('draftSessions table has index "by_case_and_user" on ["caseId", "userId"]', () => {
    expect(schemaSource).toMatch(
      /draftSessions:\s*defineTable\([\s\S]*?\.index\("by_case_and_user",\s*\["caseId",\s*"userId"\]\)/,
    );
  });

  test('draftMessages table has index "by_draft_session" on ["draftSessionId"]', () => {
    expect(schemaSource).toMatch(
      /draftMessages:\s*defineTable\([\s\S]*?\.index\("by_draft_session",\s*\["draftSessionId"\]\)/,
    );
  });

  test('inviteTokens table has index "by_token" on ["token"]', () => {
    expect(schemaSource).toMatch(
      /inviteTokens:\s*defineTable\([\s\S]*?\.index\("by_token",\s*\["token"\]\)/,
    );
  });

  test('inviteTokens table has index "by_case" on ["caseId"]', () => {
    expect(schemaSource).toMatch(
      /inviteTokens:\s*defineTable\([\s\S]*?\.index\("by_case",\s*\["caseId"\]\)/,
    );
  });

  test('templates table has index "by_category" on ["category"]', () => {
    expect(schemaSource).toMatch(
      /templates:\s*defineTable\([\s\S]*?\.index\("by_category",\s*\["category"\]\)/,
    );
  });

  test('templateVersions table has index "by_template" on ["templateId"]', () => {
    expect(schemaSource).toMatch(
      /templateVersions:\s*defineTable\([\s\S]*?\.index\("by_template",\s*\["templateId"\]\)/,
    );
  });

  test('auditLog table has index "by_actor" on ["actorUserId"]', () => {
    expect(schemaSource).toMatch(
      /auditLog:\s*defineTable\([\s\S]*?\.index\("by_actor",\s*\["actorUserId"\]\)/,
    );
  });
});

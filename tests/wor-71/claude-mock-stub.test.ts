/**
 * WOR-71 — AC: CLAUDE_MOCK=true env var triggers stub AI responder in Convex actions
 * WOR-71 — AC: Stub returns deterministic canned responses for each AI role
 *            (private coach, synthesis, joint coach, draft coach)
 *
 * The streaming module at convex/lib/streaming.ts already checks
 * process.env.CLAUDE_MOCK. These tests verify:
 *   1. A public function exists to retrieve the mock response for a given role.
 *   2. Each AI role (PRIVATE_COACH, SYNTHESIS, COACH, DRAFT_COACH) gets a
 *      distinct, deterministic canned response.
 *   3. The responses have role-appropriate shapes (e.g., SYNTHESIS returns JSON
 *      with { forInitiator, forInvitee }).
 *
 * Today these tests FAIL because only a single generic MOCK_RESPONSE exists
 * and no role-dispatch function is exported.
 */
import { describe, test, expect } from "vitest";

// This import will work (module exists) but the named export will be undefined
// until the role-specific mock API is implemented.
import { getMockResponseForRole } from "../../convex/lib/streaming";

type AIRole = "PRIVATE_COACH" | "SYNTHESIS" | "COACH" | "DRAFT_COACH";

describe("CLAUDE_MOCK=true env var triggers stub AI responder in Convex actions", () => {
  test("getMockResponseForRole is exported from convex/lib/streaming", () => {
    expect(typeof getMockResponseForRole).toBe("function");
  });

  test("calling getMockResponseForRole returns a non-empty string", () => {
    const response = getMockResponseForRole("PRIVATE_COACH");
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  });
});

describe("Stub returns deterministic canned responses for each AI role (private coach, synthesis, joint coach, draft coach)", () => {
  const roles: AIRole[] = ["PRIVATE_COACH", "SYNTHESIS", "COACH", "DRAFT_COACH"];

  test.each(roles)("getMockResponseForRole('%s') returns a non-empty string", (role) => {
    const response = getMockResponseForRole(role);
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  });

  test("each role returns a distinct response", () => {
    const responses = roles.map((role) => getMockResponseForRole(role));
    const unique = new Set(responses);
    expect(unique.size).toBe(roles.length);
  });

  test("PRIVATE_COACH response reads like a coaching message", () => {
    const response = getMockResponseForRole("PRIVATE_COACH");
    // Should contain coaching-oriented language
    expect(response.toLowerCase()).toMatch(/coach|understand|feel|situation|help/);
  });

  test("SYNTHESIS response is valid JSON with forInitiator and forInvitee keys", () => {
    const response = getMockResponseForRole("SYNTHESIS");
    const parsed = JSON.parse(response);
    expect(parsed).toHaveProperty("forInitiator");
    expect(parsed).toHaveProperty("forInvitee");
    expect(typeof parsed.forInitiator).toBe("string");
    expect(typeof parsed.forInvitee).toBe("string");
  });

  test("COACH response reads like a facilitation message", () => {
    const response = getMockResponseForRole("COACH");
    expect(response.toLowerCase()).toMatch(/both|conversation|discuss|agree|perspective/);
  });

  test("DRAFT_COACH response reads like a draft-assistance message", () => {
    const response = getMockResponseForRole("DRAFT_COACH");
    expect(response.toLowerCase()).toMatch(/draft|message|tone|rephrase|send|craft/);
  });

  test("responses are deterministic (same input → same output)", () => {
    for (const role of roles) {
      const first = getMockResponseForRole(role);
      const second = getMockResponseForRole(role);
      expect(first).toBe(second);
    }
  });
});

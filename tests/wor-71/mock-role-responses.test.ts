import { describe, test, expect, vi, afterEach } from "vitest";

/**
 * WOR-71 AC: Stub returns deterministic canned responses for each AI role
 * (private coach, synthesis, joint coach, draft coach)
 *
 * The mock stub module is expected to provide role-specific canned responses.
 * This module does not exist yet — it is part of the WOR-71 implementation.
 */

// @ts-expect-error WOR-71 red-state import: implementation is created by task-implement.
import { getMockResponse, MOCK_RESPONSES } from "../../convex/lib/claudeMock";

describe("AC: Stub returns deterministic canned responses for each AI role", () => {
  test("getMockResponse is a callable function", () => {
    expect(typeof getMockResponse).toBe("function");
  });

  test("MOCK_RESPONSES contains entries for all four AI roles", () => {
    expect(MOCK_RESPONSES).toHaveProperty("PRIVATE_COACH");
    expect(MOCK_RESPONSES).toHaveProperty("SYNTHESIS");
    expect(MOCK_RESPONSES).toHaveProperty("COACH");
    expect(MOCK_RESPONSES).toHaveProperty("DRAFT_COACH");
  });

  test.each(["PRIVATE_COACH", "SYNTHESIS", "COACH", "DRAFT_COACH"] as const)(
    "getMockResponse('%s') returns a non-empty string",
    (role) => {
      const response = getMockResponse(role);
      expect(typeof response).toBe("string");
      expect(response.length).toBeGreaterThan(0);
    },
  );

  test("PRIVATE_COACH response reads like coaching guidance", () => {
    const response = getMockResponse("PRIVATE_COACH");
    // Should be a coaching-style response, not JSON or a generic placeholder
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(20);
  });

  test("SYNTHESIS response is valid JSON with forInitiator and forInvitee keys", () => {
    const response = getMockResponse("SYNTHESIS");
    const parsed = JSON.parse(response);
    expect(parsed).toHaveProperty("forInitiator");
    expect(parsed).toHaveProperty("forInvitee");
    expect(typeof parsed.forInitiator).toBe("string");
    expect(typeof parsed.forInvitee).toBe("string");
  });

  test("COACH response reads like neutral facilitation", () => {
    const response = getMockResponse("COACH");
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(20);
  });

  test("DRAFT_COACH response reads like message-crafting help", () => {
    const response = getMockResponse("DRAFT_COACH");
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(20);
  });

  test("responses are deterministic — calling twice returns identical content", () => {
    const roles = [
      "PRIVATE_COACH",
      "SYNTHESIS",
      "COACH",
      "DRAFT_COACH",
    ] as const;
    for (const role of roles) {
      const first = getMockResponse(role);
      const second = getMockResponse(role);
      expect(first).toBe(second);
    }
  });

  test("each role returns a distinct response (not all the same)", () => {
    const responses = new Set([
      getMockResponse("PRIVATE_COACH"),
      getMockResponse("SYNTHESIS"),
      getMockResponse("COACH"),
      getMockResponse("DRAFT_COACH"),
    ]);
    // All four should be different from each other
    expect(responses.size).toBe(4);
  });
});

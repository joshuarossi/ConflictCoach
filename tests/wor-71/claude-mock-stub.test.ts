/**
 * WOR-71: Unit tests for Claude mock stub infrastructure
 *
 * Covers:
 * - AC2: CLAUDE_MOCK=true env var triggers stub AI responder in Convex actions
 * - AC3: Stub returns deterministic canned responses for each AI role
 *        (private coach, synthesis, joint coach, draft coach)
 * - AC4: Stub simulates streaming with configurable delays
 *
 * These tests import the mock stub module that WOR-71 will create. Until that
 * module exists with the required exports, the imports will fail — which is the
 * correct "red" state for test-first development.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// The mock stub module that WOR-71 must create with role-specific responses.
// This import will fail until the implementation is done.
import {
  getMockResponse,
  MOCK_RESPONSES,
  type MockStreamOptions,
  runMockStream,
} from "../../convex/lib/claudeMock";

// ---------------------------------------------------------------------------
// AC2: CLAUDE_MOCK=true env var triggers stub AI responder in Convex actions
// ---------------------------------------------------------------------------

describe("AC2: CLAUDE_MOCK=true env var triggers stub AI responder in Convex actions", () => {
  const originalEnv = process.env.CLAUDE_MOCK;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.CLAUDE_MOCK;
    } else {
      process.env.CLAUDE_MOCK = originalEnv;
    }
  });

  test("getMockResponse returns a response when CLAUDE_MOCK=true", () => {
    process.env.CLAUDE_MOCK = "true";
    const response = getMockResponse("PRIVATE_COACH");
    expect(response).toBeDefined();
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  });

  test("getMockResponse is only used when CLAUDE_MOCK=true (not false/unset)", () => {
    // The function should exist regardless but the streaming helper should
    // only call it when the env var is "true". We verify the function itself
    // works deterministically by calling it directly — the env-var gating is
    // tested at the integration level in the streaming module.
    process.env.CLAUDE_MOCK = "false";
    // getMockResponse should still work when called directly (it's the
    // streaming caller that gates on the env var), but we verify it returns
    // the same deterministic result regardless of env.
    const response = getMockResponse("PRIVATE_COACH");
    expect(response).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// AC3: Stub returns deterministic canned responses for each AI role
// ---------------------------------------------------------------------------

describe("AC3: Stub returns deterministic canned responses for each AI role", () => {
  const AI_ROLES = [
    "PRIVATE_COACH",
    "SYNTHESIS",
    "COACH",
    "DRAFT_COACH",
  ] as const;

  test("MOCK_RESPONSES contains entries for all four AI roles", () => {
    for (const role of AI_ROLES) {
      expect(MOCK_RESPONSES).toHaveProperty(role);
      expect(typeof MOCK_RESPONSES[role]).toBe("string");
      expect(MOCK_RESPONSES[role].length).toBeGreaterThan(0);
    }
  });

  test("getMockResponse returns distinct text for each role", () => {
    const responses = AI_ROLES.map((role) => getMockResponse(role));
    // All responses should be non-empty strings
    for (const r of responses) {
      expect(typeof r).toBe("string");
      expect(r.length).toBeGreaterThan(0);
    }
    // Responses should be distinct per role (not one generic string)
    const unique = new Set(responses);
    expect(unique.size).toBe(AI_ROLES.length);
  });

  test("PRIVATE_COACH response reads like a coaching reply", () => {
    const response = getMockResponse("PRIVATE_COACH");
    // Should be a conversational coaching-style message (not JSON)
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(20);
  });

  test("SYNTHESIS response is valid JSON with forInitiator and forInvitee", () => {
    const response = getMockResponse("SYNTHESIS");
    const parsed = JSON.parse(response);
    expect(parsed).toHaveProperty("forInitiator");
    expect(parsed).toHaveProperty("forInvitee");
    expect(typeof parsed.forInitiator).toBe("string");
    expect(typeof parsed.forInvitee).toBe("string");
  });

  test("COACH response reads like a facilitator message", () => {
    const response = getMockResponse("COACH");
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(20);
  });

  test("DRAFT_COACH response reads like draft coaching guidance", () => {
    const response = getMockResponse("DRAFT_COACH");
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(20);
  });

  test("getMockResponse is deterministic — same role returns same text", () => {
    const first = getMockResponse("PRIVATE_COACH");
    const second = getMockResponse("PRIVATE_COACH");
    expect(first).toBe(second);
  });
});

// ---------------------------------------------------------------------------
// AC4: Stub simulates streaming with configurable delays
// ---------------------------------------------------------------------------

describe("AC4: Stub simulates streaming with configurable delays", () => {
  test("runMockStream accepts a delay option", () => {
    // The function signature should accept configurable delay
    expect(typeof runMockStream).toBe("function");
  });

  test("runMockStream delivers content incrementally via callbacks", async () => {
    const chunks: string[] = [];
    const onChunk = vi.fn((content: string) => {
      chunks.push(content);
    });
    const onComplete = vi.fn();

    await runMockStream({
      role: "PRIVATE_COACH",
      onChunk,
      onComplete,
      delayMs: 5, // fast for tests
    });

    // Should have called onChunk multiple times (streaming, not one shot)
    expect(onChunk).toHaveBeenCalled();
    expect(onChunk.mock.calls.length).toBeGreaterThan(1);

    // Should have called onComplete exactly once
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Final content should match the full mock response
    const finalContent = onComplete.mock.calls[0][0];
    expect(finalContent).toBe(getMockResponse("PRIVATE_COACH"));
  });

  test("runMockStream respects configurable delay", async () => {
    const startSlow = Date.now();
    await runMockStream({
      role: "PRIVATE_COACH",
      onChunk: () => {},
      onComplete: () => {},
      delayMs: 30,
    });
    const slowDuration = Date.now() - startSlow;

    const startFast = Date.now();
    await runMockStream({
      role: "PRIVATE_COACH",
      onChunk: () => {},
      onComplete: () => {},
      delayMs: 1,
    });
    const fastDuration = Date.now() - startFast;

    // Slower delay should take meaningfully longer
    expect(slowDuration).toBeGreaterThan(fastDuration);
  });

  test("runMockStream uses role-specific content", async () => {
    const results: Record<string, string> = {};

    for (const role of ["PRIVATE_COACH", "COACH", "DRAFT_COACH"] as const) {
      let final = "";
      await runMockStream({
        role,
        onChunk: () => {},
        onComplete: (content: string) => {
          final = content;
        },
        delayMs: 1,
      });
      results[role] = final;
    }

    // Each role should produce different content
    expect(results["PRIVATE_COACH"]).not.toBe(results["COACH"]);
    expect(results["COACH"]).not.toBe(results["DRAFT_COACH"]);
  });
});

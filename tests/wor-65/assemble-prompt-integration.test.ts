/**
 * Tests for WOR-65 AC7: Compression integrates with assemblePrompt before
 * passing context to Claude
 *
 * When assemblePrompt is called with a large message history exceeding the
 * budget, the returned messages array should contain a SUMMARY message and
 * total tokens should be under budget. Compression should be transparent to
 * callers — same return shape.
 */
import { describe, test, expect } from "vitest";

import { assemblePrompt } from "../../convex/lib/prompts";
import type { AssemblePromptOpts } from "../../convex/lib/prompts";
import {
  estimateTokens,
  GENERATION_BUDGET,
} from "../../convex/lib/compression";

// Fake Convex IDs
const CASE_ID =
  "cases:test_case_001" as unknown as AssemblePromptOpts["caseId"];
const USER_A_ID =
  "users:test_user_a" as unknown as AssemblePromptOpts["actingUserId"];

// Helper to create a message with roughly N tokens of content
function makeMessageWithTokens(
  approxTokens: number,
  role: "user" | "assistant" = "user",
) {
  const wordCount = Math.ceil(approxTokens / 1.3);
  const content = Array.from({ length: wordCount }, (_, i) => `word${i}`).join(
    " ",
  );
  return { role, content };
}

// Build a recentHistory that exceeds the 60k generation budget
function buildOversizedHistory(): Array<{
  role: "user" | "assistant";
  content: string;
}> {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  // Create 10 messages of ~8k tokens each = ~80k total (exceeds 60k budget)
  for (let i = 0; i < 10; i++) {
    messages.push(
      makeMessageWithTokens(8_000, i % 2 === 0 ? "user" : "assistant"),
    );
  }
  return messages;
}

describe("Compression integrates with assemblePrompt before passing context to Claude", () => {
  test("assemblePrompt with oversized history returns messages containing a SUMMARY message", () => {
    const oversizedHistory = buildOversizedHistory();

    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: oversizedHistory,
    });

    // At least one message should be a SUMMARY message
    const hasSummary = result.messages.some(
      (m) => m.content.includes("SUMMARY:") || m.content.match(/SUMMARY:/i),
    );
    expect(hasSummary).toBe(true);
  });

  test("assemblePrompt with oversized history returns total tokens under the generation budget", () => {
    const oversizedHistory = buildOversizedHistory();

    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: oversizedHistory,
    });

    // Estimate total tokens in the result
    const totalTokens =
      result.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0) +
      estimateTokens(result.system);

    expect(totalTokens).toBeLessThanOrEqual(GENERATION_BUDGET);
  });

  test("assemblePrompt with undersized history returns messages without SUMMARY", () => {
    const smallHistory = [
      { role: "user" as const, content: "I feel frustrated." },
      { role: "assistant" as const, content: "Tell me more." },
    ];

    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: smallHistory,
    });

    // No SUMMARY message should be present when under budget
    const hasSummary = result.messages.some((m) =>
      m.content.match(/SUMMARY:/i),
    );
    expect(hasSummary).toBe(false);
  });

  test("assemblePrompt return shape is unchanged after compression (system + messages)", () => {
    const oversizedHistory = buildOversizedHistory();

    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: oversizedHistory,
    });

    // Same shape as always: { system: string, messages: Message[] }
    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("messages");
    expect(typeof result.system).toBe("string");
    expect(Array.isArray(result.messages)).toBe(true);
    for (const msg of result.messages) {
      expect(msg).toHaveProperty("role");
      expect(msg).toHaveProperty("content");
      expect(["user", "assistant"]).toContain(msg.role);
    }
  });

  test("compression is transparent — COACH role with oversized history also compresses", () => {
    const oversizedHistory = buildOversizedHistory();

    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: oversizedHistory,
    });

    const hasSummary = result.messages.some((m) =>
      m.content.match(/SUMMARY:/i),
    );
    expect(hasSummary).toBe(true);
  });
});

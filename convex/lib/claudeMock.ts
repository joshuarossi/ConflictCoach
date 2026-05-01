/**
 * Claude Mock — deterministic stub AI responder for E2E / integration tests.
 *
 * When `process.env.CLAUDE_MOCK === "true"`, Convex actions that would normally
 * call the Anthropic SDK use this module instead, returning canned responses
 * appropriate to each AI role (TechSpec §10.4).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Minimal context interface — only requires runMutation, which is all the mock uses. */
interface MockActionCtx {
  runMutation: (ref: any, args: any) => Promise<any>;
}

// ---------------------------------------------------------------------------
// Role-specific canned responses
// ---------------------------------------------------------------------------

export type AIRole = "PRIVATE_COACH" | "SYNTHESIS" | "COACH" | "DRAFT_COACH";

/**
 * Deterministic canned responses keyed by AI role.
 *
 * - PRIVATE_COACH: coaching-style empathetic response
 * - SYNTHESIS: JSON with `forInitiator` and `forInvitee` keys
 * - COACH: joint-session facilitation response
 * - DRAFT_COACH: draft-coaching response
 */
export const MOCK_RESPONSES: Record<AIRole, string> = {
  PRIVATE_COACH:
    "I understand your concern. Let's work through this together. " +
    "Could you tell me more about the specific situation and how it made you feel?",

  SYNTHESIS: JSON.stringify({
    forInitiator:
      "Based on your private coaching, here are the key themes: you value clear communication " +
      "and feel that expectations were not aligned. Consider focusing on shared goals during the joint session.",
    forInvitee:
      "Based on your private coaching, here are the key themes: you value mutual respect " +
      "and feel that your perspective was not fully heard. Consider expressing your needs clearly during the joint session.",
  }),

  COACH:
    "Thank you both for joining this conversation. I can see you each have important perspectives to share. " +
    "Let's start by having each of you describe what a successful outcome would look like.",

  DRAFT_COACH:
    "I can help you refine that message. Your core point is clear, but let's make sure the tone " +
    "invites dialogue rather than defensiveness. Would you like to soften the opening?",
};

/**
 * Returns the canned response text for the given AI role.
 * Falls back to the PRIVATE_COACH response for unknown roles.
 */
export function getMockResponse(role: AIRole): string {
  return MOCK_RESPONSES[role] ?? MOCK_RESPONSES.PRIVATE_COACH;
}

// ---------------------------------------------------------------------------
// Streaming simulation with configurable delays
// ---------------------------------------------------------------------------

/** Options for `runMockStreamWithDelay`. */
export interface MockStreamOptions {
  /** The AI role — determines which canned response to use. Defaults to PRIVATE_COACH. */
  role?: AIRole;
  /** Delay between word emissions in milliseconds. Defaults to 20. */
  wordDelayMs?: number;
  /** Minimum interval between DB flushes in milliseconds. Defaults to 50. */
  flushIntervalMs?: number;
}

/**
 * Simulates Claude streaming by emitting words of a canned response with
 * configurable delays between words and batched DB flushes.
 *
 * This exercises the same reactive UI code paths as production streaming:
 * 1. Content grows incrementally (STREAMING status)
 * 2. Batched flushes at configurable intervals
 * 3. Final update sets COMPLETE with a deterministic token count
 *
 * @param ctx       Convex action context (provides runMutation)
 * @param messageId The ID of the already-inserted STREAMING message row
 * @param updateMutationRef  Reference to the updateStreamingMessage mutation
 * @param options   Optional configuration for delays and role
 */
export async function runMockStreamWithDelay(
  ctx: MockActionCtx,
  messageId: string,
  updateMutationRef: any,
  options: MockStreamOptions = {},
): Promise<void> {
  const {
    role = "PRIVATE_COACH",
    wordDelayMs = 20,
    flushIntervalMs = 50,
  } = options;

  const fullText = getMockResponse(role);
  const words = fullText.split(" ");

  // Split words into chunks for batched streaming simulation.
  // Each chunk gets one flush and one aggregated delay, making total time
  // proportional to (numberOfChunks * chunkSize * wordDelayMs). Batching
  // reduces timer jitter from many small setTimeout calls and prevents
  // mutation overhead from dominating the configured delay.
  const CHUNK_COUNT = 5;
  const chunkSize = Math.max(1, Math.ceil(words.length / CHUNK_COUNT));

  for (let i = 0; i < words.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, words.length);
    const partialText = words.slice(0, end).join(" ");
    const wordsInChunk = end - i;

    // Flush partial content with STREAMING status
    await ctx.runMutation(updateMutationRef, {
      messageId,
      content: partialText,
      status: "STREAMING" as const,
    });

    // Aggregate delay: wordDelayMs * words in this chunk, plus the flush
    // interval. Adding (rather than clamping) ensures different wordDelayMs
    // values always produce distinguishable total elapsed times.
    const chunkDelay = flushIntervalMs + wordDelayMs * wordsInChunk;
    await new Promise((r) => setTimeout(r, chunkDelay));
  }

  // Final flush: mark COMPLETE with deterministic token count
  await ctx.runMutation(updateMutationRef, {
    messageId,
    content: fullText,
    status: "COMPLETE" as const,
    tokens: 42, // deterministic mock token count
  });
}

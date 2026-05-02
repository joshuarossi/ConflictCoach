/**
 * Readiness detection for Draft Coach sessions.
 *
 * Inspects user messages for readiness signals indicating the user wants
 * the Draft Coach to produce a polished draft message. Per TechSpec §6.3.4,
 * the canonical phrases and the "Generate Draft" button message trigger
 * draft generation.
 */

/** Canonical phrases that signal readiness (case-insensitive substring match). */
const READINESS_PHRASES = [
  "i'm ready",
  "draft it",
  "write the message",
  "looks good, write it",
  "generate draft",
];

/**
 * Returns true if the user message contains a readiness signal.
 * Matching is case-insensitive and triggers on substring containment,
 * so "I'm ready to send" also matches.
 */
export function detectReadiness(userMessage: string): boolean {
  if (!userMessage || userMessage.trim().length === 0) {
    return false;
  }
  const lower = userMessage.toLowerCase();
  return READINESS_PHRASES.some((phrase) => lower.includes(phrase));
}

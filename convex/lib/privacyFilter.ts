/**
 * Privacy response filter (WOR-40)
 *
 * Server-side defense against AI outputs that quote or closely paraphrase
 * one party's raw private coaching content. Tokenizes private messages and
 * scans AI output for verbatim substring matches of >= 8 consecutive tokens.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MATCH_THRESHOLD = 8;

export const FALLBACK_TEXT =
  "I've reviewed both perspectives. There are areas of common ground and areas that will need discussion. I encourage you to approach the joint session with curiosity about the other person's experience.";

// ---------------------------------------------------------------------------
// Tokenization
// ---------------------------------------------------------------------------

/**
 * Splits text into normalized tokens: lowercase, punctuation-stripped words.
 * Splits on whitespace and punctuation boundaries, collapses whitespace,
 * strips leading/trailing punctuation from each token, and filters empties.
 */
export function tokenize(text: string): string[] {
  // Split on whitespace and punctuation boundaries (em-dash, hyphens, etc.)
  const raw = text.split(/[\s\u2014\u2013\-/()[\]{}]+/);
  const tokens: string[] = [];
  for (const word of raw) {
    // Strip leading/trailing punctuation
    const cleaned = word.replace(/^[^\w]+|[^\w]+$/g, "").toLowerCase();
    if (cleaned.length > 0) {
      tokens.push(cleaned);
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Privacy violation check
// ---------------------------------------------------------------------------

export interface MatchDetail {
  messageIndex: number;
  matchedTokens: string[];
}

export interface PrivacyViolationResult {
  isViolation: boolean;
  matchDetails: MatchDetail[] | null;
}

/**
 * Checks whether `aiOutput` contains >= MATCH_THRESHOLD consecutive tokens
 * from any message in `otherPartyMessages`.
 */
export function checkPrivacyViolation(
  aiOutput: string,
  otherPartyMessages: string[],
): PrivacyViolationResult {
  if (otherPartyMessages.length === 0) {
    return { isViolation: false, matchDetails: null };
  }

  const aiTokens = tokenize(aiOutput);
  if (aiTokens.length === 0) {
    return { isViolation: false, matchDetails: null };
  }

  const matchDetails: MatchDetail[] = [];

  for (let msgIdx = 0; msgIdx < otherPartyMessages.length; msgIdx++) {
    const msgTokens = tokenize(otherPartyMessages[msgIdx]);

    // Skip messages shorter than threshold — can't form a match
    if (msgTokens.length < MATCH_THRESHOLD) {
      continue;
    }

    // Sliding window: check every consecutive window of MATCH_THRESHOLD tokens
    // from the message against the AI output tokens.
    for (let i = 0; i <= msgTokens.length - MATCH_THRESHOLD; i++) {
      const window = msgTokens.slice(i, i + MATCH_THRESHOLD);

      // Search for this window in aiTokens
      for (let j = 0; j <= aiTokens.length - MATCH_THRESHOLD; j++) {
        let match = true;
        for (let k = 0; k < MATCH_THRESHOLD; k++) {
          if (aiTokens[j + k] !== window[k]) {
            match = false;
            break;
          }
        }
        if (match) {
          matchDetails.push({
            messageIndex: msgIdx,
            matchedTokens: window,
          });
          // Found a match for this window position, move to next window
          break;
        }
      }
    }
  }

  if (matchDetails.length > 0) {
    return { isViolation: true, matchDetails };
  }

  return { isViolation: false, matchDetails: null };
}

// ---------------------------------------------------------------------------
// Retry wrapper
// ---------------------------------------------------------------------------

/**
 * Calls `generateFn` and checks the result for privacy violations.
 * Retries up to `maxRetries` times. On final failure, inserts an audit log
 * entry and returns FALLBACK_TEXT.
 *
 * @param generateFn - async function that produces AI output text
 * @param otherPartyMessages - private messages to check against
 * @param maxRetries - number of retry attempts (total calls = 1 + maxRetries)
 * @param ctx - Convex action/mutation context with db.insert for audit logging
 */
export async function filterOrRetry(
  generateFn: () => Promise<string>,
  otherPartyMessages: string[],
  maxRetries: number,
  ctx: { db: { insert: (table: string, doc: Record<string, unknown>) => unknown } },
): Promise<string> {
  const totalAttempts = 1 + maxRetries;

  let lastResult: PrivacyViolationResult | null = null;

  for (let attempt = 0; attempt < totalAttempts; attempt++) {
    const output = await generateFn();
    lastResult = checkPrivacyViolation(output, otherPartyMessages);

    if (!lastResult.isViolation) {
      return output;
    }
  }

  // All attempts exhausted — flag for admin review
  await ctx.db.insert("auditLog", {
    action: "PRIVACY_FILTER_FAILURE",
    targetType: "case",
    targetId: "unknown",
    actorUserId: "system",
    metadata: {
      matchDetails: lastResult!.matchDetails,
      attempts: totalAttempts,
    },
    createdAt: Date.now(),
  });

  return FALLBACK_TEXT;
}

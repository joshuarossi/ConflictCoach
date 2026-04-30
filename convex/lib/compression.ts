import { createHash } from "crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { Message } from "./prompts";

// ---------------------------------------------------------------------------
// Budget constants (TechSpec §6.4)
// ---------------------------------------------------------------------------

export const GENERATION_BUDGET = 60_000;
export const CLASSIFICATION_BUDGET = 10_000;

// ---------------------------------------------------------------------------
// Compression prompt & model
// ---------------------------------------------------------------------------

const COMPRESSION_PROMPT =
  "Summarize this conversation segment in 500 tokens or fewer, preserving facts, decisions, emotional tone, and unresolved threads.";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";

// ---------------------------------------------------------------------------
// In-memory cache: client -> (content hash -> summary)
// ---------------------------------------------------------------------------

const compressionCache = new Map<object, Map<string, string>>();

export function clearCompressionCache(): void {
  compressionCache.clear();
}

// ---------------------------------------------------------------------------
// Token estimation (TechSpec: "reasonable estimates" — word count × 1.3)
// ---------------------------------------------------------------------------

export function estimateTokens(text: string): number {
  if (!text) return 0;
  const words = text.split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.3);
}

// ---------------------------------------------------------------------------
// Select oldest 50% of messages for compression
// ---------------------------------------------------------------------------

export function selectMessagesForCompression(messages: Message[]): Message[] {
  if (messages.length <= 1) return [];
  const count = Math.floor(messages.length / 2);
  return messages.slice(0, count);
}

// ---------------------------------------------------------------------------
// Content hash for caching (SHA-256 of concatenated message contents)
// ---------------------------------------------------------------------------

function computeContentHash(messages: Message[]): string {
  const content = messages.map((m) => `${m.role}:${m.content}`).join("|");
  return createHash("sha256").update(content).digest("hex");
}

// ---------------------------------------------------------------------------
// Haiku compression call (one-shot, non-streaming)
// ---------------------------------------------------------------------------

export async function compressMessages(
  messages: Message[],
  anthropicClient: Anthropic,
): Promise<string> {
  const hash = computeContentHash(messages);

  let clientCache = compressionCache.get(anthropicClient as object);
  if (!clientCache) {
    clientCache = new Map();
    compressionCache.set(anthropicClient as object, clientCache);
  }

  const cached = clientCache.get(hash);
  if (cached !== undefined) return cached;

  const conversationText = messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const response = await anthropicClient.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 600,
    system: COMPRESSION_PROMPT,
    messages: [{ role: "user" as const, content: conversationText }],
  });

  const first = response.content[0];
  const summary = first.type === "text" ? first.text : "";

  clientCache.set(hash, summary);
  return summary;
}

// ---------------------------------------------------------------------------
// Replace compressed messages with a single SUMMARY message
// ---------------------------------------------------------------------------

export function replaceSummarizedMessages(
  messages: Message[],
  compressedCount: number,
  summaryText: string,
): Message[] {
  if (compressedCount === 0) return messages;

  const summaryMessage: Message = {
    role: "user",
    content: `SUMMARY: ${summaryText}`,
  };

  return [summaryMessage, ...messages.slice(compressedCount)];
}

// ---------------------------------------------------------------------------
// Budget check
// ---------------------------------------------------------------------------

export function shouldCompress(
  messages: Message[],
  budgetType: "generation" | "classification",
): boolean {
  const budget =
    budgetType === "generation" ? GENERATION_BUDGET : CLASSIFICATION_BUDGET;
  const totalTokens = messages.reduce(
    (sum, m) => sum + estimateTokens(m.content),
    0,
  );
  return totalTokens > budget;
}

// ---------------------------------------------------------------------------
// Synchronous context truncation (not AI-based) for assemblePrompt budget enforcement
// ---------------------------------------------------------------------------

export function compressContext(
  messages: Message[],
  systemPrompt: string,
  budget: number = GENERATION_BUDGET,
): Message[] {
  let result = [...messages];
  let iterations = 0;
  const maxIterations = 10;

  const totalTokens = () =>
    result.reduce((sum, m) => sum + estimateTokens(m.content), 0) +
    estimateTokens(systemPrompt);

  while (totalTokens() > budget && result.length > 1 && iterations < maxIterations) {
    iterations++;
    const toCompress = selectMessagesForCompression(result);
    if (toCompress.length === 0) break;

    const compressedContent = toCompress
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n")
      .substring(0, 500);

    result = replaceSummarizedMessages(
      result,
      toCompress.length,
      compressedContent,
    );
  }

  return result;
}

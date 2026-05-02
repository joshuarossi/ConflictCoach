/**
 * Tests for WOR-50 AC4: Readiness detection
 *
 * The draftCoach/generateResponse action must detect readiness signals in
 * user messages. Canonical phrases like "i'm ready", "draft it", "write the
 * message", "looks good, write it", and the "Generate Draft" button message
 * must trigger structured draft output. Normal conversational messages must
 * NOT trigger it.
 *
 * This file tests the pure readiness-detection function that will be
 * extracted as a testable unit in the implementation.
 */
import { describe, test, expect, beforeAll } from "vitest";

// ---------------------------------------------------------------------------
// Dynamic import — module does not exist until implementation is created.
// Tests fail with a clear "module not found" message (correct red state).
// ---------------------------------------------------------------------------

let detectReadiness: (message: string) => boolean;

beforeAll(async () => {
  // WOR-50 red-state import: convex/lib/draftCoachReadiness is created by task-implement.
  // Variable indirection prevents Vite static analysis from failing at transform time.
  const modulePath = "../../convex/lib/draftCoachReadiness";
  const mod = await import(/* @vite-ignore */ modulePath);
  detectReadiness = mod.detectReadiness;
});

// ---------------------------------------------------------------------------
// AC4: Canonical readiness phrases TRIGGER draft generation
// ---------------------------------------------------------------------------

describe("AC4: Readiness detection — positive signals", () => {
  test("\"i'm ready\" triggers readiness", () => {
    expect(detectReadiness("i'm ready")).toBe(true);
  });

  test("\"draft it\" triggers readiness", () => {
    expect(detectReadiness("draft it")).toBe(true);
  });

  test("\"write the message\" triggers readiness", () => {
    expect(detectReadiness("write the message")).toBe(true);
  });

  test("\"looks good, write it\" triggers readiness", () => {
    expect(detectReadiness("looks good, write it")).toBe(true);
  });

  test("canonical Generate Draft button message triggers readiness", () => {
    // The UI sends this exact string when the user clicks "Generate Draft"
    expect(detectReadiness("Generate Draft")).toBe(true);
  });

  test("readiness phrases are case-insensitive", () => {
    expect(detectReadiness("I'M READY")).toBe(true);
    expect(detectReadiness("Draft It")).toBe(true);
    expect(detectReadiness("WRITE THE MESSAGE")).toBe(true);
  });

  test("readiness phrase embedded in longer message still triggers", () => {
    expect(detectReadiness("OK, I'm ready to send it")).toBe(true);
    expect(detectReadiness("Please draft it for me")).toBe(true);
    expect(detectReadiness("Can you write the message now?")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC4: Normal conversation messages do NOT trigger readiness
// ---------------------------------------------------------------------------

describe("AC4: Readiness detection — negative signals", () => {
  test("\"what do you think?\" does NOT trigger readiness", () => {
    expect(detectReadiness("what do you think?")).toBe(false);
  });

  test("\"can you help me?\" does NOT trigger readiness", () => {
    expect(detectReadiness("can you help me?")).toBe(false);
  });

  test("\"I want to express my frustration\" does NOT trigger readiness", () => {
    expect(detectReadiness("I want to express my frustration")).toBe(false);
  });

  test("\"how should I phrase this?\" does NOT trigger readiness", () => {
    expect(detectReadiness("how should I phrase this?")).toBe(false);
  });

  test("empty string does NOT trigger readiness", () => {
    expect(detectReadiness("")).toBe(false);
  });

  test("\"let me think about it more\" does NOT trigger readiness", () => {
    expect(detectReadiness("let me think about it more")).toBe(false);
  });
});

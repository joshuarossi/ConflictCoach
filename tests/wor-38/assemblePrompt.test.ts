/**
 * Tests for WOR-38: AI prompt assembly module (convex/lib/prompts.ts)
 *
 * Each test maps to one acceptance criterion from the task spec.
 * Tests exercise the actual context assembly logic using partyStates,
 * privateMessages, and jointMessages parameters — not just recentHistory
 * passthrough — to verify real privacy boundary enforcement.
 */
import { describe, test, expect } from "vitest";

import {
  assemblePrompt,
  type PartyState,
  type PrivateMessage,
  type JointMessage,
  type TemplateVersion,
  type Message,
  type AssemblePromptOpts,
} from "../../convex/lib/prompts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Branded Id helpers — cast strings to the branded types the function expects
const CASE_ID = "cases:test_case_001" as AssemblePromptOpts["caseId"];
const USER_A_ID = "users:test_user_a" as AssemblePromptOpts["actingUserId"];
const USER_B_ID = "users:test_user_b" as AssemblePromptOpts["actingUserId"];

/** Recent history in Anthropic SDK message format */
const recentHistory: Message[] = [
  { role: "user", content: "I feel frustrated about this situation." },
  {
    role: "assistant",
    content: "I hear you. Can you tell me more about what happened?",
  },
];

/** Party A state with form fields and synthesis */
const partyAState: PartyState = {
  userId: USER_A_ID as PartyState["userId"],
  role: "INITIATOR",
  mainTopic: "Communication issues at work",
  description: "I feel like my voice is not heard in meetings",
  desiredOutcome: "Better collaboration and mutual respect",
  synthesisText:
    "Areas of agreement: commitment to team success. Tension: feeling excluded from decisions.",
};

/** Party B state with form fields and synthesis */
const partyBState: PartyState = {
  userId: USER_B_ID as PartyState["userId"],
  role: "INVITEE",
  mainTopic: "Communication breakdown with co-founder",
  description:
    "My co-founder ignores my input on design decisions. It feels dismissive.",
  desiredOutcome: "A structured way to make joint decisions",
  synthesisText:
    "Areas of agreement: shared commitment. Disagreement: feeling excluded from decisions. Approach: establish structured check-ins.",
};

const bothPartyStates: PartyState[] = [partyAState, partyBState];

/** Private messages for party A */
const partyAPrivateMessages: PrivateMessage[] = [
  {
    userId: USER_A_ID as PrivateMessage["userId"],
    role: "USER",
    content: "I feel like my voice is not heard.",
  },
  {
    userId: USER_A_ID as PrivateMessage["userId"],
    role: "AI",
    content:
      "That sounds really difficult. What specifically makes you feel unheard?",
  },
];

/** Private messages for party B */
const partyBPrivateMessages: PrivateMessage[] = [
  {
    userId: USER_B_ID as PrivateMessage["userId"],
    role: "USER",
    content: "They keep overriding my design choices without discussion.",
  },
  {
    userId: USER_B_ID as PrivateMessage["userId"],
    role: "AI",
    content: "That must be frustrating. Can you give me an example?",
  },
];

const allPrivateMessages: PrivateMessage[] = [
  ...partyAPrivateMessages,
  ...partyBPrivateMessages,
];

/** Joint chat messages */
const jointMessages: JointMessage[] = [
  {
    authorType: "USER",
    authorUserId: USER_A_ID as JointMessage["authorUserId"],
    content: "I think we should talk about how we make decisions.",
  },
  {
    authorType: "COACH",
    content:
      "That's a great place to start. What does a good decision process look like to each of you?",
  },
];

/** Template version with all instruction fields */
const mockTemplateVersion: TemplateVersion = {
  globalGuidance:
    "Focus on workplace conflict resolution using interest-based negotiation.",
  coachInstructions:
    "When facilitating, highlight shared goals before addressing differences.",
  draftCoachInstructions:
    "Help the user frame their message using I-statements and specific examples.",
};

// ---------------------------------------------------------------------------
// Verbatim strings from TechSpec
// ---------------------------------------------------------------------------

const PRIVATE_COACH_SYSTEM_PROMPT =
  "You are a calm, curious, non-judgmental listener helping a person articulate their perspective in an interpersonal conflict. Ask clarifying questions. Reflect what they say. Help them identify what they actually want, what they're feeling, and what the other person might be thinking. Do not take sides. Do not tell them they're right or wrong. Your only goal is to help them prepare to communicate with the other party clearly and calmly.";

const ANTI_QUOTATION_INSTRUCTION =
  "You have access to both parties' private content for context. In your outputs, NEVER quote, closely paraphrase, or otherwise surface the other party's raw words. Synthesize themes and positions in your own words only. If you cannot make a point without quoting, omit it.";

// ---------------------------------------------------------------------------
// Helper: serialize all output content for searching
// ---------------------------------------------------------------------------

function allOutputContent(result: { system: string; messages: Message[] }): string {
  return (
    result.system + " " + result.messages.map((m) => m.content).join(" ")
  );
}

// ---------------------------------------------------------------------------
// AC 1: assemblePrompt function accepts { role, caseId, actingUserId,
//        recentHistory, templateVersion? } and returns { system, messages }
// ---------------------------------------------------------------------------
describe("AC 1: assemblePrompt function signature and return shape", () => {
  const roles = ["PRIVATE_COACH", "SYNTHESIS", "COACH", "DRAFT_COACH"] as const;

  for (const role of roles) {
    test(`assemblePrompt with role=${role} returns { system: string, messages: Array<{role, content}> }`, () => {
      const result = assemblePrompt({
        role,
        caseId: CASE_ID,
        actingUserId: USER_A_ID,
        recentHistory,
      });

      expect(result).toHaveProperty("system");
      expect(result).toHaveProperty("messages");
      expect(typeof result.system).toBe("string");
      expect(result.system.length).toBeGreaterThan(0);
      expect(Array.isArray(result.messages)).toBe(true);

      for (const msg of result.messages) {
        expect(msg).toHaveProperty("role");
        expect(msg).toHaveProperty("content");
        expect(["user", "assistant"]).toContain(msg.role);
        expect(typeof msg.content).toBe("string");
      }
    });
  }

  test("assemblePrompt accepts optional templateVersion parameter", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory,
      templateVersion: mockTemplateVersion,
    });

    expect(result).toHaveProperty("system");
    expect(result).toHaveProperty("messages");
  });
});

// ---------------------------------------------------------------------------
// AC 2: PRIVATE_COACH — hardcoded system prompt; context includes ONLY acting
//        user's form fields + their private message history; NO other party data
// ---------------------------------------------------------------------------
describe("AC 2: PRIVATE_COACH uses hardcoded system prompt and isolates party data", () => {
  test("PRIVATE_COACH system prompt matches TechSpec §6.3.1 verbatim", () => {
    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
    });

    expect(result.system).toContain(PRIVATE_COACH_SYSTEM_PROMPT);
  });

  test("PRIVATE_COACH context contains acting user's form fields", () => {
    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
    });

    const content = allOutputContent(result);
    // Acting user's form fields should be present
    expect(content).toContain(partyAState.mainTopic);
  });

  test("PRIVATE_COACH context contains acting user's private messages", () => {
    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
    });

    const content = allOutputContent(result);
    expect(content).toContain("I feel like my voice is not heard");
  });

  test("PRIVATE_COACH context contains NO other party's form fields", () => {
    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
    });

    const content = allOutputContent(result);
    // Must NOT contain party B's form fields
    expect(content).not.toContain(partyBState.description);
    expect(content).not.toContain(partyBState.desiredOutcome);
  });

  test("PRIVATE_COACH context contains NO other party's private messages", () => {
    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
    });

    const content = allOutputContent(result);
    // Must NOT contain party B's private messages
    expect(content).not.toContain(
      "They keep overriding my design choices without discussion",
    );
  });

  test("PRIVATE_COACH context contains NO synthesis data", () => {
    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
    });

    const content = allOutputContent(result);
    expect(content).not.toContain(partyBState.synthesisText);
  });
});

// ---------------------------------------------------------------------------
// AC 3: SYNTHESIS — system prompt includes anti-quotation rules verbatim;
//        includes both parties' private content; outputs JSON format
// ---------------------------------------------------------------------------
describe("AC 3: SYNTHESIS anti-quotation rules and dual-party context", () => {
  test("SYNTHESIS system prompt contains verbatim anti-quotation instruction from TechSpec §6.3.2", () => {
    const result = assemblePrompt({
      role: "SYNTHESIS",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
    });

    expect(result.system).toContain(ANTI_QUOTATION_INSTRUCTION);
  });

  test("SYNTHESIS context includes both parties' private content via privateMessages", () => {
    const result = assemblePrompt({
      role: "SYNTHESIS",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
    });

    const content = allOutputContent(result);
    // Should contain content from both parties
    expect(content).toContain("I feel like my voice is not heard");
    expect(content).toContain(
      "They keep overriding my design choices without discussion",
    );
  });

  test("SYNTHESIS context includes both parties' form fields", () => {
    const result = assemblePrompt({
      role: "SYNTHESIS",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
    });

    const content = allOutputContent(result);
    expect(content).toContain(partyAState.mainTopic);
    expect(content).toContain(partyBState.mainTopic);
  });

  test("SYNTHESIS system prompt instructs JSON output format with forInitiator/forInvitee", () => {
    const result = assemblePrompt({
      role: "SYNTHESIS",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
    });

    expect(result.system).toMatch(/json/i);
    expect(result.system).toMatch(/forInitiator/);
    expect(result.system).toMatch(/forInvitee/);
  });
});

// ---------------------------------------------------------------------------
// AC 4: COACH — context includes joint chat history + both synthesis texts;
//        NO raw private messages
// ---------------------------------------------------------------------------
describe("AC 4: COACH includes synthesis and joint history, excludes raw privates", () => {
  test("COACH context includes joint chat history", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
      jointMessages,
    });

    const content = allOutputContent(result);
    expect(content).toContain(
      "I think we should talk about how we make decisions",
    );
  });

  test("COACH context includes both parties' synthesis texts", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
      jointMessages,
    });

    const content = allOutputContent(result);
    expect(content).toContain(partyAState.synthesisText);
    expect(content).toContain(partyBState.synthesisText);
  });

  test("COACH context does NOT include any raw private messages", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
      jointMessages,
    });

    const content = allOutputContent(result);
    // Must NOT contain either party's raw private messages
    expect(content).not.toContain("I feel like my voice is not heard");
    expect(content).not.toContain(
      "They keep overriding my design choices without discussion",
    );
  });
});

// ---------------------------------------------------------------------------
// AC 5: DRAFT_COACH — context includes drafting user's joint-chat history +
//        their own synthesis only; NO other party's synthesis or private content
// ---------------------------------------------------------------------------
describe("AC 5: DRAFT_COACH own-synthesis only, no other party data", () => {
  test("DRAFT_COACH context includes joint chat history", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
      jointMessages,
    });

    const content = allOutputContent(result);
    expect(content).toContain(
      "I think we should talk about how we make decisions",
    );
  });

  test("DRAFT_COACH context includes the acting user's own synthesis", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
      jointMessages,
    });

    const content = allOutputContent(result);
    expect(content).toContain(partyAState.synthesisText);
  });

  test("DRAFT_COACH context does NOT include the other party's synthesis", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
      jointMessages,
    });

    const content = allOutputContent(result);
    expect(content).not.toContain(partyBState.synthesisText);
  });

  test("DRAFT_COACH context does NOT include any raw private messages", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      partyStates: bothPartyStates,
      privateMessages: allPrivateMessages,
      jointMessages,
    });

    const content = allOutputContent(result);
    expect(content).not.toContain("I feel like my voice is not heard");
    expect(content).not.toContain(
      "They keep overriding my design choices without discussion",
    );
  });
});

// ---------------------------------------------------------------------------
// AC 6: Template version instructions (globalGuidance, coachInstructions,
//        draftCoachInstructions) are prepended to system prompt when present
// ---------------------------------------------------------------------------
describe("AC 6: Template merging behavior across roles", () => {
  test("COACH role: globalGuidance and coachInstructions appear in system prompt", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      templateVersion: mockTemplateVersion,
    });

    expect(result.system).toContain(mockTemplateVersion.globalGuidance);
    expect(result.system).toContain(mockTemplateVersion.coachInstructions);
  });

  test("COACH role: draftCoachInstructions do NOT appear in system prompt", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      templateVersion: mockTemplateVersion,
    });

    expect(result.system).not.toContain(
      mockTemplateVersion.draftCoachInstructions,
    );
  });

  test("DRAFT_COACH role: globalGuidance and draftCoachInstructions appear in system prompt", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      templateVersion: mockTemplateVersion,
    });

    expect(result.system).toContain(mockTemplateVersion.globalGuidance);
    expect(result.system).toContain(
      mockTemplateVersion.draftCoachInstructions,
    );
  });

  test("DRAFT_COACH role: coachInstructions do NOT appear in system prompt", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      templateVersion: mockTemplateVersion,
    });

    expect(result.system).not.toContain(
      mockTemplateVersion.coachInstructions,
    );
  });

  test("PRIVATE_COACH role: no template content is included even when templateVersion is provided", () => {
    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      templateVersion: mockTemplateVersion,
    });

    expect(result.system).not.toContain(mockTemplateVersion.globalGuidance);
    expect(result.system).not.toContain(
      mockTemplateVersion.coachInstructions,
    );
    expect(result.system).not.toContain(
      mockTemplateVersion.draftCoachInstructions,
    );
    // Hardcoded system prompt should still be present
    expect(result.system).toContain(PRIVATE_COACH_SYSTEM_PROMPT);
  });

  test("SYNTHESIS role: template instructions are not applied", () => {
    const result = assemblePrompt({
      role: "SYNTHESIS",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      templateVersion: mockTemplateVersion,
    });

    // Synthesis has its own self-contained prompt; anti-quotation must be present
    expect(result.system).toContain(ANTI_QUOTATION_INSTRUCTION);
  });

  test("When no templateVersion is provided, system prompt works without template content", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
    });

    expect(result.system.length).toBeGreaterThan(0);
    expect(result.system).not.toContain(mockTemplateVersion.globalGuidance);
    expect(result.system).not.toContain(
      mockTemplateVersion.coachInstructions,
    );
  });
});

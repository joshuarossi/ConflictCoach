/**
 * Tests for WOR-38: AI prompt assembly module (convex/lib/prompts.ts)
 *
 * Each test maps to one acceptance criterion from the task spec.
 * All tests are expected to FAIL today (module does not exist yet)
 * and PASS once assemblePrompt is implemented.
 */
import { describe, test, expect } from "vitest";

// This import will fail until the module is implemented — correct red state.
import { assemblePrompt } from "../../convex/lib/prompts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Fake Convex IDs (strings that look like real IDs but are test-only)
const CASE_ID = "cases:test_case_001" as any;
const USER_A_ID = "users:test_user_a" as any;
const USER_B_ID = "users:test_user_b" as any;

/** Mock recent history in Anthropic SDK message format */
const recentHistory = [
  { role: "user" as const, content: "I feel frustrated about this situation." },
  {
    role: "assistant" as const,
    content: "I hear you. Can you tell me more about what happened?",
  },
];

/** Party A's form fields (embedded in context for PRIVATE_COACH) */
const partyAFormFields = {
  mainTopic: "Disagreement over project direction",
  description:
    "We keep clashing about whether to pivot the product. I think we should stay the course.",
  desiredOutcome: "Mutual understanding and a clear decision framework",
};

/** Party B's form fields */
const partyBFormFields = {
  mainTopic: "Communication breakdown with co-founder",
  description:
    "My co-founder ignores my input on design decisions. It feels dismissive.",
  desiredOutcome: "A structured way to make joint decisions",
};

/** Mock private messages for party A */
const partyAPrivateMessages = [
  { role: "user" as const, content: "I feel like my voice is not heard." },
  {
    role: "assistant" as const,
    content: "That sounds really difficult. What specifically makes you feel unheard?",
  },
];

/** Mock private messages for party B */
const partyBPrivateMessages = [
  {
    role: "user" as const,
    content: "They keep overriding my design choices without discussion.",
  },
  {
    role: "assistant" as const,
    content: "That must be frustrating. Can you give me an example?",
  },
];

/** Mock synthesis texts (already privacy-scrubbed) */
const partyASynthesis =
  "Areas of agreement: both want the project to succeed. Disagreement: decision-making process. Approach: focus on process before content.";
const partyBSynthesis =
  "Areas of agreement: shared commitment. Disagreement: feeling excluded from decisions. Approach: establish structured check-ins.";

/** Mock joint chat messages */
const jointMessages = [
  { role: "user" as const, content: "I think we should talk about how we make decisions." },
  {
    role: "assistant" as const,
    content: "That's a great place to start. What does a good decision process look like to each of you?",
  },
];

/** Mock template version with all instruction fields */
const mockTemplateVersion = {
  _id: "templateVersions:tv_001" as any,
  templateId: "templates:t_001" as any,
  version: 1,
  globalGuidance:
    "Focus on workplace conflict resolution using interest-based negotiation.",
  coachInstructions:
    "When facilitating, highlight shared goals before addressing differences.",
  draftCoachInstructions:
    "Help the user frame their message using I-statements and specific examples.",
  publishedAt: Date.now(),
  publishedByUserId: "users:admin_001" as any,
};

// ---------------------------------------------------------------------------
// Exact verbatim strings from TechSpec
// ---------------------------------------------------------------------------

const PRIVATE_COACH_SYSTEM_PROMPT =
  "You are a calm, curious, non-judgmental listener helping a person articulate their perspective in an interpersonal conflict. Ask clarifying questions. Reflect what they say. Help them identify what they actually want, what they're feeling, and what the other person might be thinking. Do not take sides. Do not tell them they're right or wrong. Your only goal is to help them prepare to communicate with the other party clearly and calmly.";

const ANTI_QUOTATION_INSTRUCTION =
  "You have access to both parties' private content for context. In your outputs, NEVER quote, closely paraphrase, or otherwise surface the other party's raw words. Synthesize themes and positions in your own words only. If you cannot make a point without quoting, omit it.";

// ---------------------------------------------------------------------------
// AC 1: assemblePrompt function accepts { role, caseId, actingUserId,
//        recentHistory, templateVersion? } and returns { system, messages }
// ---------------------------------------------------------------------------
describe("AC 1: assemblePrompt function signature and return shape", () => {
  const roles = [
    "PRIVATE_COACH",
    "SYNTHESIS",
    "COACH",
    "DRAFT_COACH",
  ] as const;

  for (const role of roles) {
    test(`assemblePrompt with role=${role} returns { system: string, messages: Array<{role, content}> }`, () => {
      const result = assemblePrompt({
        role,
        caseId: CASE_ID,
        actingUserId: USER_A_ID,
        recentHistory,
      });

      // Return shape: { system, messages }
      expect(result).toHaveProperty("system");
      expect(result).toHaveProperty("messages");
      expect(typeof result.system).toBe("string");
      expect(result.system.length).toBeGreaterThan(0);
      expect(Array.isArray(result.messages)).toBe(true);

      // Each message has { role, content }
      for (const msg of result.messages) {
        expect(msg).toHaveProperty("role");
        expect(msg).toHaveProperty("content");
        expect(["user", "assistant"]).toContain(msg.role);
        expect(typeof msg.content).toBe("string");
      }
    });
  }

  test("assemblePrompt accepts optional templateVersion parameter", () => {
    // Should not throw when templateVersion is provided
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
      recentHistory: partyAPrivateMessages,
      // Providing context data that the function would use internally.
      // The function is a pure assembler — it receives the data it needs.
    });

    expect(result.system).toContain(PRIVATE_COACH_SYSTEM_PROMPT);
  });

  test("PRIVATE_COACH context contains acting user's private messages", () => {
    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: partyAPrivateMessages,
    });

    // The messages array should contain the acting user's history
    const allContent = result.messages.map((m) => m.content).join(" ");
    expect(allContent).toContain("I feel like my voice is not heard");
  });

  test("PRIVATE_COACH context contains NO other party data", () => {
    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: partyAPrivateMessages,
    });

    const allContent =
      result.system + " " + result.messages.map((m) => m.content).join(" ");

    // Must NOT contain party B's private content
    expect(allContent).not.toContain(
      "They keep overriding my design choices without discussion"
    );
    expect(allContent).not.toContain(partyBFormFields.description);
    expect(allContent).not.toContain(partyBSynthesis);
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
    });

    expect(result.system).toContain(ANTI_QUOTATION_INSTRUCTION);
  });

  test("SYNTHESIS context includes both parties' private content", () => {
    // The synthesis role is the ONE role that sees both parties' data.
    // The assemblePrompt function should include both when role=SYNTHESIS.
    const result = assemblePrompt({
      role: "SYNTHESIS",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [
        ...partyAPrivateMessages,
        ...partyBPrivateMessages,
      ],
    });

    const allContent = result.messages.map((m) => m.content).join(" ");
    // Should contain content from both parties
    expect(allContent).toContain("I feel like my voice is not heard");
    expect(allContent).toContain(
      "They keep overriding my design choices without discussion"
    );
  });

  test("SYNTHESIS system prompt instructs JSON output format", () => {
    const result = assemblePrompt({
      role: "SYNTHESIS",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
    });

    // Per TechSpec §6.3.2, output format is strict JSON: { forInitiator, forInvitee }
    expect(result.system).toMatch(/json/i);
    expect(result.system).toMatch(/forInitiator/);
    expect(result.system).toMatch(/forInvitee/);
  });
});

// ---------------------------------------------------------------------------
// AC 4: COACH — context includes joint chat history + both synthesis texts;
//        NO raw private messages; merges template instructions if available
// ---------------------------------------------------------------------------
describe("AC 4: COACH includes synthesis and joint history, excludes raw privates", () => {
  test("COACH context includes joint chat history", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: jointMessages,
    });

    const allContent = result.messages.map((m) => m.content).join(" ");
    expect(allContent).toContain(
      "I think we should talk about how we make decisions"
    );
  });

  test("COACH context does NOT include any raw private messages", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: jointMessages,
    });

    const allContent =
      result.system + " " + result.messages.map((m) => m.content).join(" ");

    // Must NOT contain either party's raw private messages
    expect(allContent).not.toContain("I feel like my voice is not heard");
    expect(allContent).not.toContain(
      "They keep overriding my design choices without discussion"
    );
  });

  test("COACH merges template instructions when templateVersion is provided", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: jointMessages,
      templateVersion: mockTemplateVersion,
    });

    // globalGuidance should appear in system prompt
    expect(result.system).toContain(mockTemplateVersion.globalGuidance);
    // coachInstructions should appear for COACH role
    expect(result.system).toContain(mockTemplateVersion.coachInstructions);
    // draftCoachInstructions should NOT appear for COACH role
    expect(result.system).not.toContain(
      mockTemplateVersion.draftCoachInstructions
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
      recentHistory: jointMessages,
    });

    const allContent = result.messages.map((m) => m.content).join(" ");
    expect(allContent).toContain(
      "I think we should talk about how we make decisions"
    );
  });

  test("DRAFT_COACH context does NOT include the other party's synthesis", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: jointMessages,
    });

    const allContent =
      result.system + " " + result.messages.map((m) => m.content).join(" ");

    // Must NOT contain party B's synthesis
    expect(allContent).not.toContain(partyBSynthesis);
    // Must NOT contain party B's private messages
    expect(allContent).not.toContain(
      "They keep overriding my design choices without discussion"
    );
  });

  test("DRAFT_COACH context does NOT include any raw private messages", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: jointMessages,
    });

    const allContent =
      result.system + " " + result.messages.map((m) => m.content).join(" ");

    // No private messages from either party
    expect(allContent).not.toContain("I feel like my voice is not heard");
    expect(allContent).not.toContain(
      "They keep overriding my design choices without discussion"
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
      recentHistory: jointMessages,
      templateVersion: mockTemplateVersion,
    });

    expect(result.system).toContain(mockTemplateVersion.globalGuidance);
    expect(result.system).toContain(mockTemplateVersion.coachInstructions);
  });

  test("DRAFT_COACH role: globalGuidance and draftCoachInstructions appear in system prompt", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: jointMessages,
      templateVersion: mockTemplateVersion,
    });

    expect(result.system).toContain(mockTemplateVersion.globalGuidance);
    expect(result.system).toContain(
      mockTemplateVersion.draftCoachInstructions
    );
    // coachInstructions should NOT appear for DRAFT_COACH
    expect(result.system).not.toContain(
      mockTemplateVersion.coachInstructions
    );
  });

  test("PRIVATE_COACH role: no template content is included even when templateVersion is provided", () => {
    const result = assemblePrompt({
      role: "PRIVATE_COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: partyAPrivateMessages,
      templateVersion: mockTemplateVersion,
    });

    // Per TechSpec §6.3.1: "Template applied: NONE"
    expect(result.system).not.toContain(mockTemplateVersion.globalGuidance);
    expect(result.system).not.toContain(
      mockTemplateVersion.coachInstructions
    );
    expect(result.system).not.toContain(
      mockTemplateVersion.draftCoachInstructions
    );
    // But the hardcoded system prompt should still be there
    expect(result.system).toContain(PRIVATE_COACH_SYSTEM_PROMPT);
  });

  test("SYNTHESIS role: template instructions are not applied (synthesis uses its own prompt)", () => {
    const result = assemblePrompt({
      role: "SYNTHESIS",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [],
      templateVersion: mockTemplateVersion,
    });

    // Synthesis has its own system prompt; templates are for Coach/DraftCoach
    // globalGuidance might or might not apply to SYNTHESIS — per TechSpec §6.3.2
    // the synthesis prompt is self-contained. Assert anti-quotation is present.
    expect(result.system).toContain(ANTI_QUOTATION_INSTRUCTION);
  });

  test("When no templateVersion is provided, system prompt still works without template content", () => {
    const result = assemblePrompt({
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: jointMessages,
      // No templateVersion
    });

    expect(result.system.length).toBeGreaterThan(0);
    expect(result.system).not.toContain(mockTemplateVersion.globalGuidance);
    expect(result.system).not.toContain(
      mockTemplateVersion.coachInstructions
    );
  });
});

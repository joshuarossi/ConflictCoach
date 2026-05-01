/**
 * WOR-45: AI Synthesis generation — prompt assembly tests
 *
 * Covers:
 * - AC1: Action reads both parties' private messages and form fields as context
 * - AC2: System prompt contains verbatim anti-quotation rules from TechSpec §6.3.2
 */
import { describe, test, expect } from "vitest";
import {
  assemblePrompt,
  type AssemblePromptOpts,
  type PartyState,
  type PrivateMessage,
} from "../../convex/lib/prompts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const USER_INITIATOR = "user_initiator" as any;
const USER_INVITEE = "user_invitee" as any;
const CASE_ID = "case_synthesis" as any;

const initiatorPartyState: PartyState = {
  userId: USER_INITIATOR,
  role: "INITIATOR",
  mainTopic: "Disagreement over project direction",
  description: "We cannot agree on the technical architecture for the new product.",
  desiredOutcome: "A shared roadmap we both feel ownership of",
};

const inviteePartyState: PartyState = {
  userId: USER_INVITEE,
  role: "INVITEE",
  mainTopic: "Communication breakdown with co-founder",
  description: "My co-founder makes decisions without consulting me.",
  desiredOutcome: "Better communication and shared decision-making",
};

const initiatorMessages: PrivateMessage[] = [
  { userId: USER_INITIATOR, role: "USER", content: "I feel like my opinions are ignored." },
  { userId: USER_INITIATOR, role: "AI", content: "Can you give me a specific example?" },
  { userId: USER_INITIATOR, role: "USER", content: "Last week they picked the database without asking me." },
];

const inviteeMessages: PrivateMessage[] = [
  { userId: USER_INVITEE, role: "USER", content: "I just want them to trust my judgment more." },
  { userId: USER_INVITEE, role: "AI", content: "What would that trust look like in practice?" },
  { userId: USER_INVITEE, role: "USER", content: "They would let me lead the backend decisions." },
];

function makeSynthesisOpts(
  overrides: Partial<AssemblePromptOpts> = {},
): AssemblePromptOpts {
  return {
    role: "SYNTHESIS",
    caseId: CASE_ID,
    actingUserId: USER_INITIATOR,
    recentHistory: [],
    partyStates: [initiatorPartyState, inviteePartyState],
    privateMessages: [...initiatorMessages, ...inviteeMessages],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AC 1: Action reads both parties' private messages and form fields as context
// ---------------------------------------------------------------------------
describe("AC1: Synthesis prompt includes both parties' form fields and private messages", () => {
  test("both parties' form fields appear in the assembled messages", () => {
    const result = assemblePrompt(makeSynthesisOpts());
    const allContent = result.messages.map((m) => m.content).join("\n");

    // Initiator form fields
    expect(allContent).toContain(initiatorPartyState.mainTopic);
    expect(allContent).toContain(initiatorPartyState.description);
    expect(allContent).toContain(initiatorPartyState.desiredOutcome);

    // Invitee form fields
    expect(allContent).toContain(inviteePartyState.mainTopic);
    expect(allContent).toContain(inviteePartyState.description);
    expect(allContent).toContain(inviteePartyState.desiredOutcome);
  });

  test("both parties' private coaching messages appear in the assembled messages", () => {
    const result = assemblePrompt(makeSynthesisOpts());
    const allContent = result.messages.map((m) => m.content).join("\n");

    // Initiator private messages
    for (const msg of initiatorMessages) {
      expect(allContent).toContain(msg.content);
    }

    // Invitee private messages
    for (const msg of inviteeMessages) {
      expect(allContent).toContain(msg.content);
    }
  });

  test("labels distinguish the two parties in context", () => {
    const result = assemblePrompt(makeSynthesisOpts());
    const allContent = result.messages.map((m) => m.content).join("\n");

    // The assembler should label parties distinctly (e.g., Party A / Party B)
    expect(allContent).toMatch(/Party [AB]/);
  });

  test("assembles correctly when one party has no private messages", () => {
    const result = assemblePrompt(
      makeSynthesisOpts({ privateMessages: [...initiatorMessages] }),
    );
    const allContent = result.messages.map((m) => m.content).join("\n");

    // Initiator messages still present
    expect(allContent).toContain("I feel like my opinions are ignored.");
    // Both parties' form fields still present
    expect(allContent).toContain(inviteePartyState.mainTopic);
  });

  test("assembles correctly when no private messages are provided", () => {
    const result = assemblePrompt(makeSynthesisOpts({ privateMessages: [] }));
    const allContent = result.messages.map((m) => m.content).join("\n");

    // Form fields should still be present
    expect(allContent).toContain(initiatorPartyState.mainTopic);
    expect(allContent).toContain(inviteePartyState.mainTopic);
  });
});

// ---------------------------------------------------------------------------
// AC 2: System prompt contains verbatim anti-quotation rules
// ---------------------------------------------------------------------------
describe("AC2: System prompt contains verbatim anti-quotation rules from TechSpec §6.3.2", () => {
  const VERBATIM_ANTI_QUOTATION =
    "You have access to both parties' private content for context. In your outputs, NEVER quote, closely paraphrase, or otherwise surface the other party's raw words. Synthesize themes and positions in your own words only. If you cannot make a point without quoting, omit it.";

  test("system prompt contains the exact anti-quotation instruction", () => {
    const result = assemblePrompt(makeSynthesisOpts());
    expect(result.system).toContain(VERBATIM_ANTI_QUOTATION);
  });

  test("system prompt instructs JSON output format", () => {
    const result = assemblePrompt(makeSynthesisOpts());
    expect(result.system).toContain("forInitiator");
    expect(result.system).toContain("forInvitee");
  });

  test("system prompt mentions required synthesis sections", () => {
    const result = assemblePrompt(makeSynthesisOpts());
    // Per TechSpec: areas of likely agreement, genuine points of disagreement,
    // suggested communication approaches
    expect(result.system).toMatch(/agreement/i);
    expect(result.system).toMatch(/disagree/i);
    expect(result.system).toMatch(/communication/i);
  });
});

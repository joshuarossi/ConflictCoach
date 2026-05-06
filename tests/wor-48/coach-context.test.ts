/**
 * WOR-48: Coach facilitator AI — Context assembly tests
 *
 * AC 4: Coach context includes joint chat history + both parties' synthesis
 *        texts (NOT raw private messages)
 */
import { describe, test, expect } from "vitest";
import { assemblePrompt } from "../../convex/lib/prompts";
import type {
  AssemblePromptOpts,
  PartyState,
  JointMessage,
} from "../../convex/lib/prompts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_A_ID = "user_a_id" as AssemblePromptOpts["actingUserId"];
const USER_B_ID = "user_b_id" as AssemblePromptOpts["actingUserId"];
const CASE_ID = "case_123" as AssemblePromptOpts["caseId"];

const partyStates: PartyState[] = [
  {
    userId: USER_A_ID,
    role: "INITIATOR",
    mainTopic: "Workspace disagreement",
    description: "We disagree about desk assignments",
    desiredOutcome: "Fair resolution",
    synthesisText:
      "Party A feels strongly about having a quiet workspace and is open to compromise on timing.",
  },
  {
    userId: USER_B_ID,
    role: "INVITEE",
    mainTopic: "Workspace disagreement",
    description: "I think the current arrangement is fine",
    desiredOutcome: "Keep current arrangement",
    synthesisText:
      "Party B values the current setup but may be open to discussing alternatives.",
  },
];

const jointMessages: JointMessage[] = [
  {
    authorType: "COACH",
    content: "Welcome to the joint session. Let's discuss the workspace issue.",
  },
  {
    authorType: "USER",
    authorUserId: USER_A_ID,
    content: "I'd like to talk about the noise levels.",
  },
  {
    authorType: "USER",
    authorUserId: USER_B_ID,
    content: "I understand your concern.",
  },
];

// Raw private messages that should NEVER appear in coach context
const PRIVATE_MESSAGE_CONTENT_A =
  "My coworker is so inconsiderate and never thinks about anyone else's needs";
const PRIVATE_MESSAGE_CONTENT_B =
  "I think they're being dramatic about the whole situation honestly";

// ---------------------------------------------------------------------------
// AC 4: Coach context includes synthesis + joint history, excludes private
// ---------------------------------------------------------------------------
describe("AC 4: Coach context excludes raw private messages", () => {
  test("assemblePrompt with role=COACH includes both parties' synthesis texts", () => {
    const opts: AssemblePromptOpts = {
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [
        { role: "user", content: "Can you help us find common ground?" },
      ],
      partyStates,
      jointMessages,
    };

    const result = assemblePrompt(opts);
    const allContent =
      result.system + " " + result.messages.map((m) => m.content).join(" ");

    // Synthesis texts should be present
    expect(allContent).toContain("Party A feels strongly");
    expect(allContent).toContain("Party B values the current setup");
  });

  test("assemblePrompt with role=COACH includes joint chat history", () => {
    const opts: AssemblePromptOpts = {
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [{ role: "user", content: "What should we focus on?" }],
      partyStates,
      jointMessages,
    };

    const result = assemblePrompt(opts);
    const allContent = result.messages.map((m) => m.content).join(" ");

    // Joint chat messages should be present in context
    expect(allContent).toContain("Welcome to the joint session");
    expect(allContent).toContain("noise levels");
  });

  test("assemblePrompt with role=COACH never includes raw private messages", () => {
    const opts: AssemblePromptOpts = {
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [{ role: "user", content: "Help us" }],
      partyStates,
      jointMessages,
      // Even if private messages are accidentally passed, the COACH assembler
      // should not include them in the output.
      privateMessages: [
        { userId: USER_A_ID, role: "USER", content: PRIVATE_MESSAGE_CONTENT_A },
        { userId: USER_B_ID, role: "USER", content: PRIVATE_MESSAGE_CONTENT_B },
      ],
    };

    const result = assemblePrompt(opts);
    const allContent =
      result.system + " " + result.messages.map((m) => m.content).join(" ");

    // Raw private messages must NOT appear anywhere in the assembled prompt
    expect(allContent).not.toContain(PRIVATE_MESSAGE_CONTENT_A);
    expect(allContent).not.toContain(PRIVATE_MESSAGE_CONTENT_B);
    expect(allContent).not.toContain("inconsiderate");
    expect(allContent).not.toContain("dramatic");
  });

  test("COACH system prompt instructs against revealing private content", () => {
    const opts: AssemblePromptOpts = {
      role: "COACH",
      caseId: CASE_ID,
      actingUserId: USER_A_ID,
      recentHistory: [{ role: "user", content: "test" }],
      partyStates,
    };

    const result = assemblePrompt(opts);

    // The system prompt should contain anti-leakage instruction
    expect(result.system.toLowerCase()).toContain("never");
    expect(result.system.toLowerCase()).toContain("private");
  });
});

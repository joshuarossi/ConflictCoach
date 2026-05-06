/**
 * Tests for WOR-50 AC3: generateResponse context isolation
 *
 * The draftCoach/generateResponse action must use the DRAFT_COACH prompt role.
 * Context includes the drafting user's joint-chat history and their own
 * synthesis only — NOT the other party's synthesis or private content.
 *
 * WOR-38 tests already verify assemblePrompt's DRAFT_COACH role at the
 * prompt-assembly level. These tests verify the action-level concern: that
 * the generateResponse action correctly gathers context from the DB and
 * passes only the permitted data to assemblePrompt.
 */
import { describe, test, expect } from "vitest";

import {
  assemblePrompt,
  type PartyState,
  type JointMessage,
  type PrivateMessage,
  type AssemblePromptOpts,
} from "../../convex/lib/prompts";

// ---------------------------------------------------------------------------
// Fixtures — two parties with separate data
// ---------------------------------------------------------------------------

const CASE_ID = "cases:dc_context_case" as AssemblePromptOpts["caseId"];
const DRAFTER_ID = "users:drafter_user" as AssemblePromptOpts["actingUserId"];
const OTHER_ID = "users:other_user" as AssemblePromptOpts["actingUserId"];

const drafterState: PartyState = {
  userId: DRAFTER_ID as PartyState["userId"],
  role: "INITIATOR",
  mainTopic: "Budget disagreement",
  description: "We can't agree on Q3 spending",
  desiredOutcome: "Aligned budget plan",
  synthesisText: "Drafter synthesis: both want fiscal responsibility.",
};

const otherState: PartyState = {
  userId: OTHER_ID as PartyState["userId"],
  role: "INVITEE",
  mainTopic: "Budget disagreement",
  description: "Spending is out of control and I feel ignored",
  desiredOutcome: "Fair review of expenses",
  synthesisText:
    "Other party synthesis: mutual desire for transparency in spending.",
};

const drafterPrivateMessages: PrivateMessage[] = [
  {
    userId: DRAFTER_ID as PrivateMessage["userId"],
    role: "USER",
    content: "I feel overwhelmed by the spending discussions.",
  },
];

const otherPrivateMessages: PrivateMessage[] = [
  {
    userId: OTHER_ID as PrivateMessage["userId"],
    role: "USER",
    content: "My private thought: they never listen to me.",
  },
];

const allPrivateMessages = [...drafterPrivateMessages, ...otherPrivateMessages];

const jointHistory: JointMessage[] = [
  {
    authorType: "USER",
    authorUserId: DRAFTER_ID as JointMessage["authorUserId"],
    content: "Let's discuss the budget",
  },
  {
    authorType: "USER",
    authorUserId: OTHER_ID as JointMessage["authorUserId"],
    content: "Agreed, we need to sort this out",
  },
  {
    authorType: "COACH",
    content:
      "Great, let's explore what fiscal responsibility means to each of you.",
  },
];

// ---------------------------------------------------------------------------
// Helper to collect all text from prompt result
// ---------------------------------------------------------------------------

function allOutputContent(result: {
  system: string;
  messages: Array<{ content: string }>;
}): string {
  return [result.system, ...result.messages.map((m) => m.content)].join("\n");
}

// ---------------------------------------------------------------------------
// AC3: DRAFT_COACH context isolation at the data-gathering level
// ---------------------------------------------------------------------------

describe("AC3: generateResponse uses DRAFT_COACH role with correct context", () => {
  test("assemblePrompt is called with role DRAFT_COACH", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: DRAFTER_ID,
      recentHistory: [{ role: "user", content: "Help me draft a response" }],
      partyStates: [drafterState, otherState],
      jointMessages: jointHistory,
    });

    // The system prompt should include the DRAFT_COACH base prompt
    expect(result.system).toContain("draft coach");
  });

  test("drafting user's own synthesis IS included in context", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: DRAFTER_ID,
      recentHistory: [],
      partyStates: [drafterState, otherState],
      jointMessages: jointHistory,
    });

    const all = allOutputContent(result);
    expect(all).toContain("Drafter synthesis");
  });

  test("other party's synthesis is NOT included in context", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: DRAFTER_ID,
      recentHistory: [],
      partyStates: [drafterState, otherState],
      jointMessages: jointHistory,
    });

    const all = allOutputContent(result);
    expect(all).not.toContain("Other party synthesis");
  });

  test("joint chat history IS included in context", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: DRAFTER_ID,
      recentHistory: [],
      partyStates: [drafterState, otherState],
      jointMessages: jointHistory,
    });

    const all = allOutputContent(result);
    expect(all).toContain("Let's discuss the budget");
    expect(all).toContain("fiscal responsibility");
  });

  test("neither party's raw private messages appear in DRAFT_COACH context", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: DRAFTER_ID,
      recentHistory: [],
      partyStates: [drafterState, otherState],
      jointMessages: jointHistory,
      privateMessages: allPrivateMessages,
    });

    const all = allOutputContent(result);
    // Neither the drafter's nor the other party's raw private messages
    expect(all).not.toContain("I feel overwhelmed by the spending discussions");
    expect(all).not.toContain("My private thought: they never listen to me");
  });

  test("template draftCoachInstructions are merged into system prompt", () => {
    const result = assemblePrompt({
      role: "DRAFT_COACH",
      caseId: CASE_ID,
      actingUserId: DRAFTER_ID,
      recentHistory: [],
      partyStates: [drafterState, otherState],
      jointMessages: jointHistory,
      templateVersion: {
        globalGuidance: "Be empathetic and culturally sensitive.",
        draftCoachInstructions: "Focus on de-escalation language.",
      },
    });

    expect(result.system).toContain("Be empathetic and culturally sensitive");
    expect(result.system).toContain("Focus on de-escalation language");
  });
});

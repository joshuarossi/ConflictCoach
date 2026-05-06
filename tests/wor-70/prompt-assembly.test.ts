import { describe, test, expect } from "vitest";
import {
  assemblePrompt,
  type AssemblePromptOpts,
  type PartyState,
  type PrivateMessage,
  type JointMessage,
  type TemplateVersion,
  type Message,
} from "../../convex/lib/prompts";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

type Id<T extends string> = string & { __tableName: T };

const ALICE_ID = "user_alice" as Id<"users">;
const BOB_ID = "user_bob" as Id<"users">;
const CASE_ID = "case_1" as Id<"cases">;

const alicePartyState: PartyState = {
  userId: ALICE_ID,
  role: "INITIATOR",
  mainTopic: "Workplace disagreement about project direction",
  description: "We disagree on the tech stack choice for the new project.",
  desiredOutcome: "Find a compromise we can both support.",
  synthesisText:
    "Alice synthesis: Both parties value project success. Key disagreement on technology.",
};

const bobPartyState: PartyState = {
  userId: BOB_ID,
  role: "INVITEE",
  mainTopic: "Project tech stack conflict",
  description: "Alice wants React, I want Vue. We need to agree.",
  desiredOutcome: "A fair process for making the decision.",
  synthesisText:
    "Bob synthesis: Common ground on user experience goals. Disagreement on implementation.",
};

const alicePrivateMessages: PrivateMessage[] = [
  {
    userId: ALICE_ID,
    role: "USER",
    content: "I feel frustrated with the tech stack debate.",
  },
  {
    userId: ALICE_ID,
    role: "AI",
    content: "Tell me more about what frustrates you.",
  },
];

const bobPrivateMessages: PrivateMessage[] = [
  {
    userId: BOB_ID,
    role: "USER",
    content: "Alice never listens to my Vue arguments.",
  },
  {
    userId: BOB_ID,
    role: "AI",
    content: "What specifically do you want her to understand?",
  },
];

const allPrivateMessages = [...alicePrivateMessages, ...bobPrivateMessages];

const jointMessages: JointMessage[] = [
  { authorType: "COACH", content: "Welcome to the joint session." },
  {
    authorType: "USER",
    authorUserId: ALICE_ID,
    content: "Thanks, glad to be here.",
  },
];

const templateVersion: TemplateVersion = {
  globalGuidance:
    "This is a workplace conflict. Focus on professional resolution.",
  coachInstructions: "Pay special attention to power dynamics.",
  draftCoachInstructions: "Help the user avoid accusatory language.",
};

const recentHistory: Message[] = [
  { role: "user", content: "Can you help me think about this?" },
];

function baseOpts(
  overrides: Partial<AssemblePromptOpts> = {},
): AssemblePromptOpts {
  return {
    role: "PRIVATE_COACH",
    caseId: CASE_ID,
    actingUserId: ALICE_ID,
    recentHistory,
    partyStates: [alicePartyState, bobPartyState],
    privateMessages: allPrivateMessages,
    jointMessages,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Prompt assembly tests: each role gets correct context and system prompt; no cross-party data leakage in PRIVATE_COACH context", () => {
  // -----------------------------------------------------------------------
  // PRIVATE_COACH
  // -----------------------------------------------------------------------

  describe("PRIVATE_COACH role", () => {
    test("system prompt contains role-specific listener/coaching content", () => {
      const result = assemblePrompt(baseOpts({ role: "PRIVATE_COACH" }));
      expect(result.system).toContain("listener");
      expect(result.system).toContain("conflict");
    });

    test("messages include acting user's form fields", () => {
      const result = assemblePrompt(baseOpts({ role: "PRIVATE_COACH" }));
      const allContent = result.messages.map((m) => m.content).join("\n");
      expect(allContent).toContain(alicePartyState.mainTopic!);
      expect(allContent).toContain(alicePartyState.description!);
    });

    test("messages include ONLY acting user's private messages", () => {
      const result = assemblePrompt(baseOpts({ role: "PRIVATE_COACH" }));
      const allContent = result.messages.map((m) => m.content).join("\n");
      // Alice's content should be present
      expect(allContent).toContain(
        "I feel frustrated with the tech stack debate",
      );
      // Bob's content must be ABSENT — this is the core privacy invariant
      expect(allContent).not.toContain(
        "Alice never listens to my Vue arguments",
      );
      expect(allContent).not.toContain(
        "What specifically do you want her to understand",
      );
    });

    test("does NOT include Bob's form fields", () => {
      const result = assemblePrompt(baseOpts({ role: "PRIVATE_COACH" }));
      const allContent = result.messages.map((m) => m.content).join("\n");
      expect(allContent).not.toContain(bobPartyState.mainTopic!);
      expect(allContent).not.toContain(bobPartyState.description!);
      expect(allContent).not.toContain(bobPartyState.desiredOutcome!);
    });

    test("does NOT apply template guidance (PRIVATE_COACH is template-free)", () => {
      const result = assemblePrompt(
        baseOpts({ role: "PRIVATE_COACH", templateVersion }),
      );
      expect(result.system).not.toContain(templateVersion.globalGuidance);
    });
  });

  // -----------------------------------------------------------------------
  // SYNTHESIS
  // -----------------------------------------------------------------------

  describe("SYNTHESIS role", () => {
    test("system prompt contains anti-quotation instruction", () => {
      const result = assemblePrompt(baseOpts({ role: "SYNTHESIS" }));
      expect(result.system).toContain("NEVER quote");
    });

    test("system prompt contains JSON output format requirement", () => {
      const result = assemblePrompt(baseOpts({ role: "SYNTHESIS" }));
      expect(result.system).toContain("forInitiator");
      expect(result.system).toContain("forInvitee");
    });

    test("context includes both parties' form fields and private messages", () => {
      const result = assemblePrompt(baseOpts({ role: "SYNTHESIS" }));
      const allContent = result.messages.map((m) => m.content).join("\n");
      // Both parties' content should be present (synthesis sees everything)
      expect(allContent).toContain(alicePartyState.mainTopic!);
      expect(allContent).toContain(bobPartyState.mainTopic!);
    });
  });

  // -----------------------------------------------------------------------
  // COACH
  // -----------------------------------------------------------------------

  describe("COACH role", () => {
    test("system prompt contains facilitation content", () => {
      const result = assemblePrompt(baseOpts({ role: "COACH" }));
      expect(result.system).toContain("facilitating");
    });

    test("template instructions are prepended when templateVersion is provided", () => {
      const result = assemblePrompt(
        baseOpts({ role: "COACH", templateVersion }),
      );
      expect(result.system).toContain(templateVersion.globalGuidance);
      expect(result.system).toContain(templateVersion.coachInstructions!);
    });

    test("context includes synthesis texts, not raw private messages", () => {
      const result = assemblePrompt(baseOpts({ role: "COACH" }));
      const allContent = result.messages.map((m) => m.content).join("\n");
      expect(allContent).toContain("Alice synthesis");
      expect(allContent).toContain("Bob synthesis");
      // Should NOT include raw private coaching messages
      expect(allContent).not.toContain(
        "I feel frustrated with the tech stack debate",
      );
      expect(allContent).not.toContain(
        "Alice never listens to my Vue arguments",
      );
    });

    test("context includes joint chat history", () => {
      const result = assemblePrompt(baseOpts({ role: "COACH" }));
      const allContent = result.messages.map((m) => m.content).join("\n");
      expect(allContent).toContain("Welcome to the joint session");
    });
  });

  // -----------------------------------------------------------------------
  // DRAFT_COACH
  // -----------------------------------------------------------------------

  describe("DRAFT_COACH role", () => {
    test("system prompt contains draft composition content", () => {
      const result = assemblePrompt(baseOpts({ role: "DRAFT_COACH" }));
      expect(result.system).toContain("draft");
    });

    test("template instructions are prepended when templateVersion is provided", () => {
      const result = assemblePrompt(
        baseOpts({ role: "DRAFT_COACH", templateVersion }),
      );
      expect(result.system).toContain(templateVersion.globalGuidance);
      expect(result.system).toContain(templateVersion.draftCoachInstructions!);
    });

    test("context includes only acting user's synthesis, not other party's", () => {
      const result = assemblePrompt(baseOpts({ role: "DRAFT_COACH" }));
      const allContent = result.messages.map((m) => m.content).join("\n");
      expect(allContent).toContain("Alice synthesis");
      expect(allContent).not.toContain("Bob synthesis");
    });

    test("context includes joint chat history", () => {
      const result = assemblePrompt(baseOpts({ role: "DRAFT_COACH" }));
      const allContent = result.messages.map((m) => m.content).join("\n");
      expect(allContent).toContain("Welcome to the joint session");
    });
  });
});

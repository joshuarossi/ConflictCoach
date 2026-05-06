import { throwAppError, INVALID_INPUT } from "./errors";
import { compressContext, GENERATION_BUDGET } from "./compression";

/**
 * Branded Id type matching Convex's Id<TableName>.
 * Uses a local definition to avoid depending on _generated/dataModel
 * which may not exist until `npx convex dev` has run.
 */
type Id<T extends string> = string & { __tableName: T };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Anthropic SDK message format. */
export interface Message {
  role: "user" | "assistant";
  content: string;
}

export type AIRole = "PRIVATE_COACH" | "SYNTHESIS" | "COACH" | "DRAFT_COACH";

export interface PartyState {
  userId: Id<"users">;
  role: "INITIATOR" | "INVITEE";
  mainTopic?: string;
  description?: string;
  desiredOutcome?: string;
  synthesisText?: string;
}

export interface PrivateMessage {
  userId: Id<"users">;
  role: "USER" | "AI";
  content: string;
}

export interface JointMessage {
  authorType: "USER" | "COACH";
  authorUserId?: Id<"users">;
  content: string;
}

export interface TemplateVersion {
  globalGuidance: string;
  coachInstructions?: string;
  draftCoachInstructions?: string;
}

export interface AssemblePromptOpts {
  role: AIRole;
  caseId: Id<"cases">;
  actingUserId: Id<"users">;
  recentHistory: Message[];
  templateVersion?: TemplateVersion;
  /** Context data passed in by the caller (action reads from DB). */
  partyStates?: PartyState[];
  privateMessages?: PrivateMessage[];
  jointMessages?: JointMessage[];
}

export interface AssemblePromptResult {
  system: string;
  messages: Message[];
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const PRIVATE_COACH_SYSTEM_PROMPT =
  "You are a calm, curious, non-judgmental listener helping a person articulate their perspective in an interpersonal conflict. Ask clarifying questions. Reflect what they say. Help them identify what they actually want, what they're feeling, and what the other person might be thinking. Do not take sides. Do not tell them they're right or wrong. Your only goal is to help them prepare to communicate with the other party clearly and calmly.";

const SYNTHESIS_ANTI_QUOTATION_INSTRUCTION =
  "You have access to both parties' private content for context. In your outputs, NEVER quote, closely paraphrase, or otherwise surface the other party's raw words. Synthesize themes and positions in your own words only. If you cannot make a point without quoting, omit it.";

const SYNTHESIS_SYSTEM_PROMPT = `You are a conflict resolution synthesizer. Given both parties' private coaching content, produce two independent synthesis texts — one per party — each containing:
1. Areas of likely agreement
2. Genuine points of disagreement
3. Suggested communication approaches for the joint session

${SYNTHESIS_ANTI_QUOTATION_INSTRUCTION}

You MUST output strict JSON in this format:
{ "forInitiator": "...", "forInvitee": "..." }`;

const COACH_BASE_SYSTEM_PROMPT =
  "You are a conflict resolution coach facilitating a joint conversation between two parties. Guide the conversation toward mutual understanding and resolution. You have access to both parties' synthesis texts for context but never reveal private coaching content.";

const DRAFT_COACH_BASE_SYSTEM_PROMPT =
  "You are a draft coach helping a party compose a message for the joint conversation. Ask clarifying questions about their intent, surface potential tone issues, and help them communicate clearly and constructively. When they signal readiness, produce a polished draft.";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActingUserPartyState(
  partyStates: PartyState[],
  actingUserId: Id<"users">,
): PartyState {
  const ps = partyStates.find((p) => p.userId === actingUserId);
  if (!ps) {
    throwAppError(INVALID_INPUT, "Missing partyState for acting user");
  }
  return ps;
}

function formatFormFields(ps: PartyState): string {
  const parts: string[] = [];
  if (ps.mainTopic) parts.push(`Main topic: ${ps.mainTopic}`);
  if (ps.description) parts.push(`Description: ${ps.description}`);
  if (ps.desiredOutcome) parts.push(`Desired outcome: ${ps.desiredOutcome}`);
  return parts.join("\n");
}

function prependTemplateGuidance(
  systemPrompt: string,
  templateVersion: TemplateVersion | undefined,
  roleInstructions: string | undefined,
): string {
  const parts: string[] = [];
  if (templateVersion?.globalGuidance) {
    parts.push(templateVersion.globalGuidance);
  }
  if (roleInstructions) {
    parts.push(roleInstructions);
  }
  parts.push(systemPrompt);
  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Role-specific assemblers
// ---------------------------------------------------------------------------

function assemblePrivateCoach(opts: AssemblePromptOpts): AssemblePromptResult {
  const { actingUserId, recentHistory, partyStates, privateMessages } = opts;

  const contextParts: string[] = [];

  if (partyStates && partyStates.length > 0) {
    const actingPS = getActingUserPartyState(partyStates, actingUserId);
    const formFields = formatFormFields(actingPS);
    if (formFields) {
      contextParts.push(formFields);
    }
  }

  // Filter private messages to acting user only
  if (privateMessages && privateMessages.length > 0) {
    const userMessages = privateMessages.filter(
      (m) => m.userId === actingUserId,
    );
    if (userMessages.length > 0) {
      contextParts.push(
        "Prior private coaching messages:\n" +
          userMessages.map((m) => `${m.role}: ${m.content}`).join("\n"),
      );
    }
  }

  const messages: Message[] = [];
  if (contextParts.length > 0) {
    messages.push({ role: "user", content: contextParts.join("\n\n") });
    messages.push({
      role: "assistant",
      content: "I understand the context. How can I help you today?",
    });
  }
  messages.push(...recentHistory);

  // PRIVATE_COACH never uses templates
  return {
    system: PRIVATE_COACH_SYSTEM_PROMPT,
    messages,
  };
}

/**
 * Assembles the prompt for the SYNTHESIS role. Unlike other roles, synthesis
 * intentionally receives BOTH parties' private coaching content so it can
 * identify areas of agreement and disagreement. The anti-quotation instruction
 * in the system prompt prevents raw private content from leaking into outputs.
 */
function assembleSynthesis(opts: AssemblePromptOpts): AssemblePromptResult {
  const { actingUserId, recentHistory, partyStates, privateMessages } = opts;

  const contextParts: string[] = [];

  if (partyStates && partyStates.length > 0) {
    for (const ps of partyStates) {
      const label = ps.userId === actingUserId ? "Party A" : "Party B";
      const formFields = formatFormFields(ps);
      if (formFields) {
        contextParts.push(`${label} form fields:\n${formFields}`);
      }
    }
  }

  // Synthesis sees BOTH parties' private content
  if (privateMessages && privateMessages.length > 0) {
    for (const ps of partyStates ?? []) {
      const label = ps.userId === actingUserId ? "Party A" : "Party B";
      const partyMsgs = privateMessages.filter((m) => m.userId === ps.userId);
      if (partyMsgs.length > 0) {
        contextParts.push(
          `${label} private coaching messages:\n` +
            partyMsgs.map((m) => `${m.role}: ${m.content}`).join("\n"),
        );
      }
    }
  }

  const messages: Message[] = [];
  if (contextParts.length > 0) {
    messages.push({ role: "user", content: contextParts.join("\n\n") });
  }
  messages.push(...recentHistory);

  return {
    system: SYNTHESIS_SYSTEM_PROMPT,
    messages,
  };
}

function assembleCoach(opts: AssemblePromptOpts): AssemblePromptResult {
  const {
    actingUserId,
    recentHistory,
    templateVersion,
    partyStates,
    jointMessages,
  } = opts;

  const contextParts: string[] = [];

  // Include both parties' synthesis texts (privacy-scrubbed), never raw private messages
  if (partyStates && partyStates.length > 0) {
    for (const ps of partyStates) {
      const label = ps.userId === actingUserId ? "Party A" : "Party B";
      if (ps.synthesisText) {
        contextParts.push(`${label} synthesis:\n${ps.synthesisText}`);
      }
    }
  }

  // Include joint chat history
  if (jointMessages && jointMessages.length > 0) {
    contextParts.push(
      "Joint chat history:\n" +
        jointMessages
          .map((m) => {
            const author = m.authorType === "COACH" ? "Coach" : "User";
            return `${author}: ${m.content}`;
          })
          .join("\n"),
    );
  }

  const messages: Message[] = [];
  if (contextParts.length > 0) {
    messages.push({ role: "user", content: contextParts.join("\n\n") });
    messages.push({
      role: "assistant",
      content: "I have the context. I will facilitate this conversation.",
    });
  }
  messages.push(...recentHistory);

  // Merge template: globalGuidance + coachInstructions
  const system = prependTemplateGuidance(
    COACH_BASE_SYSTEM_PROMPT,
    templateVersion,
    templateVersion?.coachInstructions,
  );

  return { system, messages };
}

function assembleDraftCoach(opts: AssemblePromptOpts): AssemblePromptResult {
  const {
    actingUserId,
    recentHistory,
    templateVersion,
    partyStates,
    jointMessages,
  } = opts;

  const contextParts: string[] = [];

  // Only the drafting user's own synthesis — NOT the other party's
  if (partyStates && partyStates.length > 0) {
    const actingPS = getActingUserPartyState(partyStates, actingUserId);
    if (actingPS.synthesisText) {
      contextParts.push(`Your synthesis:\n${actingPS.synthesisText}`);
    }
  }

  // Include joint chat history (drafting user is a party, they've already seen it)
  if (jointMessages && jointMessages.length > 0) {
    contextParts.push(
      "Joint chat history:\n" +
        jointMessages
          .map((m) => {
            const author = m.authorType === "COACH" ? "Coach" : "User";
            return `${author}: ${m.content}`;
          })
          .join("\n"),
    );
  }

  const messages: Message[] = [];
  if (contextParts.length > 0) {
    messages.push({ role: "user", content: contextParts.join("\n\n") });
    messages.push({
      role: "assistant",
      content:
        "I have the context. Let me help you draft your message. What would you like to say?",
    });
  }
  messages.push(...recentHistory);

  // Merge template: globalGuidance + draftCoachInstructions
  const system = prependTemplateGuidance(
    DRAFT_COACH_BASE_SYSTEM_PROMPT,
    templateVersion,
    templateVersion?.draftCoachInstructions,
  );

  return { system, messages };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function assemblePrompt(opts: AssemblePromptOpts): AssemblePromptResult {
  let result: AssemblePromptResult;
  switch (opts.role) {
    case "PRIVATE_COACH":
      result = assemblePrivateCoach(opts);
      break;
    case "SYNTHESIS":
      result = assembleSynthesis(opts);
      break;
    case "COACH":
      result = assembleCoach(opts);
      break;
    case "DRAFT_COACH":
      result = assembleDraftCoach(opts);
      break;
    default: {
      const _exhaustive: never = opts.role;
      throwAppError(INVALID_INPUT, `Unknown AI role: ${_exhaustive}`);
    }
  }

  result.messages = compressContext(
    result.messages,
    result.system,
    GENERATION_BUDGET,
  );

  return result;
}

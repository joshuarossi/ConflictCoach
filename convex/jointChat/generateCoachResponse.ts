/**
 * WOR-48 — Coach facilitator AI action.
 *
 * Per TechSpec §6.3.3, this module is the entry point for the joint-chat
 * Coach. The implementation lives in convex/jointChat.ts (alongside the
 * WOR-47 query/mutation surface) so the Convex internal ref tree is flat
 * and the file remains the single source of registration. This file
 * re-exports the WOR-48 symbols so consumers (tests, callers) can import
 * them from the spec'd path.
 *
 * Note: tests import `generateCoachResponse` from this module and call it
 * directly with a DI-shaped args object — so we re-export the
 * `generateCoachResponseHandler` plain function under that name. The
 * runtime Convex action (also named `generateCoachResponse` but a
 * RegisteredAction object) is reachable via `internal.jointChat.generateCoachResponse`.
 */
export {
  classifyMessage,
  generateCoachResponseHandler as generateCoachResponse,
  generateOpeningMessage,
  buildOpeningMessagePrompt,
  CLASSIFICATIONS_REQUIRING_RESPONSE,
  getIsIntervention,
  type Classification,
} from "../jointChat";

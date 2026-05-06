/**
 * WOR-30: shared mock helpers for whole-app render tests.
 *
 * These tests render <AppRoutes /> end-to-end, which mounts many components
 * each calling useQuery against different api refs. A single useQuery mock
 * returning one canned object breaks consumers that expect arrays
 * (cases, messages, templates) — they call .filter / .map / .some on it.
 *
 * Strategy: mock `convex/_generated/api` to return string tokens for every
 * api ref, and make useQuery dispatch on those tokens. Each test file
 * imports `mockConvex` and calls it before importing AppRoutes.
 *
 * Why a function (not a vi.mock at module scope): vi.mock has to be in the
 * test file because the path is relative. The helper centralizes the
 * dispatch table so every WOR-30 test agrees on safe-default shapes.
 */
import { vi } from "vitest";

export interface UserShape {
  role: "USER" | "ADMIN";
  displayName: string;
  email?: string;
  _id?: string;
}

export interface ConvexMockOptions {
  user?: UserShape | null;
  cases?: unknown[];
  messages?: unknown[];
  templates?: unknown[];
  caseGet?: unknown;
  partyStates?: unknown;
  synthesis?: unknown;
}

// Default shapes that satisfy the components rendered by AppRoutes without
// triggering loading branches. Each is overridable via opts.
export const defaultUser: UserShape = {
  role: "USER",
  displayName: "Test User",
  email: "test@example.com",
  _id: "users:test",
};

export const defaultCaseGet = {
  _id: "cases:test",
  status: "DRAFT_PRIVATE_COACHING",
  category: "workplace",
  mainTopic: "Test conflict",
  description: "",
  desiredOutcome: "",
  otherPartyName: "Jordan",
  isSolo: false,
  createdAt: 0,
  updatedAt: 0,
};

export const defaultPartyStates = {
  self: {
    userId: "users:test",
    role: "INITIATOR" as const,
    privateCoachingCompletedAt: null,
  },
  other: {
    userId: "users:other",
    role: "INVITEE" as const,
    privateCoachingCompletedAt: null,
  },
  all: [
    {
      userId: "users:test",
      role: "INITIATOR" as const,
      privateCoachingCompletedAt: null,
    },
    {
      userId: "users:other",
      role: "INVITEE" as const,
      privateCoachingCompletedAt: null,
    },
  ],
};

/**
 * Returns a useQuery dispatcher that maps api-ref tokens (set up by the
 * companion api mock) to canned data. Unknown tokens return undefined
 * (Convex's "loading" state) — components handle that correctly.
 */
export function makeUseQueryDispatcher(opts: ConvexMockOptions = {}) {
  const user = opts.user === undefined ? defaultUser : opts.user;
  return (token: string) => {
    switch (token) {
      case "users:me":
        return user;
      case "cases:list":
        return opts.cases ?? [];
      case "cases:get":
        return opts.caseGet ?? defaultCaseGet;
      case "cases:partyStates":
        return opts.partyStates ?? defaultPartyStates;
      case "jointChat:messages":
      case "privateCoaching:messages":
        return opts.messages ?? [];
      case "jointChat:mySynthesis":
        return opts.synthesis ?? null;
      case "admin/templates:list":
      case "admin/templates:listAll":
      case "admin/templates:listPublished":
      case "templates:list":
        return opts.templates ?? [];
      case "admin/audit:list":
        return [];
      default:
        return undefined;
    }
  };
}

/**
 * The api mock to pair with the dispatcher above. Every entry maps an api
 * path to a string token; useQuery's mock then receives that token.
 */
export const apiMock = {
  api: {
    users: { me: "users:me" },
    cases: {
      list: "cases:list",
      get: "cases:get",
      partyStates: "cases:partyStates",
      create: { create: vi.fn() },
    },
    jointChat: {
      messages: "jointChat:messages",
      mySynthesis: "jointChat:mySynthesis",
      sendUserMessage: vi.fn(),
      enterJointSession: vi.fn(),
    },
    privateCoaching: {
      messages: "privateCoaching:messages",
      sendUserMessage: vi.fn(),
      markComplete: vi.fn(),
    },
    caseClosure: {
      proposeClosure: vi.fn(),
    },
    "admin/templates": {
      list: "admin/templates:list",
      listAll: "admin/templates:listAll",
      listPublished: "admin/templates:listPublished",
    },
    invites: {
      getByToken: { getByToken: "invites:getByToken" },
      redeem: { redeem: vi.fn() },
      decline: { decline: vi.fn() },
    },
    templates: { list: "templates:list" },
    "admin/audit": { list: "admin/audit:list" },
    draftCoach: {
      sessionData: undefined,
      readiness: undefined,
      sendMessage: vi.fn(),
      sendFinalDraft: vi.fn(),
      discard: vi.fn(),
    },
  },
};

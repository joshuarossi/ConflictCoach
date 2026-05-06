/**
 * WOR-75: Shared test utilities for privacy security tests.
 */
import { vi } from "vitest";

export interface MockUser {
  _id: string;
  email: string;
  displayName?: string;
  role: "USER" | "ADMIN";
  createdAt: number;
}

export const USER_A: MockUser = {
  _id: "users:userA",
  email: "userA@test.com",
  displayName: "Alice",
  role: "USER",
  createdAt: 1000,
};

export const USER_B: MockUser = {
  _id: "users:userB",
  email: "userB@test.com",
  displayName: "Bob",
  role: "USER",
  createdAt: 1001,
};

export const ADMIN_USER: MockUser = {
  _id: "users:admin1",
  email: "admin@test.com",
  displayName: "Admin",
  role: "ADMIN",
  createdAt: 900,
};

export const CASE_ID = "cases:case1";

export const CASE_BOTH_PC = {
  _id: CASE_ID,
  status: "BOTH_PRIVATE_COACHING" as const,
  initiatorUserId: USER_A._id,
  inviteeUserId: USER_B._id,
  isSolo: false,
  category: "workplace",
  schemaVersion: 1 as const,
  createdAt: 500,
  updatedAt: 500,
};

export const CASE_JOINT_ACTIVE = {
  _id: CASE_ID,
  status: "JOINT_ACTIVE" as const,
  initiatorUserId: USER_A._id,
  inviteeUserId: USER_B._id,
  isSolo: false,
  category: "workplace",
  schemaVersion: 1 as const,
  createdAt: 500,
  updatedAt: 500,
};

export const PARTY_STATE_A = {
  _id: "partyStates:psA",
  caseId: CASE_ID,
  userId: USER_A._id,
  role: "INITIATOR" as const,
  mainTopic: "Project deadline disagreement",
  description: "We disagree about the Q3 timeline for the marketing launch.",
  desiredOutcome: "Agree on a realistic schedule that works for both teams.",
  formCompletedAt: 1000,
  privateCoachingCompletedAt: 2000,
};

export const PARTY_STATE_B = {
  _id: "partyStates:psB",
  caseId: CASE_ID,
  userId: USER_B._id,
  role: "INVITEE" as const,
  mainTopic: "Resource allocation conflict",
  description:
    "The engineering team is being stretched too thin across projects.",
  desiredOutcome: "Get dedicated engineering resources for our sprint.",
  formCompletedAt: 1100,
  privateCoachingCompletedAt: 2100,
};

/** User A's private coaching messages — distinctive content for privacy checks */
export const USER_A_PRIVATE_MESSAGES = [
  {
    _id: "privateMessages:pm1",
    caseId: CASE_ID,
    userId: USER_A._id,
    role: "USER" as const,
    content:
      "My manager Sarah constantly undermines my decisions in front of the entire team during our weekly standup meetings",
    status: "COMPLETE" as const,
    createdAt: 1500,
  },
  {
    _id: "privateMessages:pm2",
    caseId: CASE_ID,
    userId: USER_A._id,
    role: "AI" as const,
    content:
      "That sounds frustrating. Can you tell me more about when this started?",
    status: "COMPLETE" as const,
    createdAt: 1501,
  },
];

/** User B's private coaching messages — distinctive content for privacy checks */
export const USER_B_PRIVATE_MESSAGES = [
  {
    _id: "privateMessages:pm3",
    caseId: CASE_ID,
    userId: USER_B._id,
    role: "USER" as const,
    content:
      "I feel completely ignored whenever I raise concerns about the aggressive timeline for the product redesign project",
    status: "COMPLETE" as const,
    createdAt: 1600,
  },
  {
    _id: "privateMessages:pm4",
    caseId: CASE_ID,
    userId: USER_B._id,
    role: "AI" as const,
    content:
      "I understand that feeling. Let's explore what outcome you're hoping for.",
    status: "COMPLETE" as const,
    createdAt: 1601,
  },
];

interface MockQueryChain {
  withIndex: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  collect: ReturnType<typeof vi.fn>;
  first: ReturnType<typeof vi.fn>;
}

function mockQueryChain(results: unknown[]): MockQueryChain {
  const chain: MockQueryChain = {
    withIndex: vi.fn((): MockQueryChain => chain),
    order: vi.fn((): MockQueryChain => chain),
    collect: vi.fn(async () => results),
    first: vi.fn(async () => results[0] ?? null),
  };
  return chain;
}

export interface CreateMockCtxOptions {
  user?: MockUser | null;
  dbGet?: Record<string, unknown>;
  dbQueries?: Record<string, unknown[]>;
}

export function createMockCtx(options: CreateMockCtxOptions = {}) {
  const { user = null, dbGet = {}, dbQueries = {} } = options;

  return {
    auth: {
      getUserIdentity: vi.fn(async () =>
        user ? { email: user.email, subject: user._id } : null,
      ),
    },
    db: {
      get: vi.fn(async (id: string) => dbGet[id] ?? null),
      query: vi.fn((table: string) => {
        if (table === "users") {
          return mockQueryChain(user ? [user] : []);
        }
        return mockQueryChain(dbQueries[table] ?? []);
      }),
      insert: vi.fn(async () => "inserted:new_id"),
      patch: vi.fn(async () => undefined),
    },
    scheduler: {
      runAfter: vi.fn(),
    },
  };
}

/**
 * Extract the handler function from a Convex function definition.
 */
export function getHandler(
  fn: Record<string, unknown> | ((...args: unknown[]) => unknown),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (...args: any[]) => any {
  return typeof fn === "function"
    ? fn
    : (fn.handler as (...args: unknown[]) => unknown);
}

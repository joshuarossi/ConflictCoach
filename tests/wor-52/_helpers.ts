/**
 * WOR-52: Shared test utilities for case closure backend tests.
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
  role: "USER",
  createdAt: 1000,
};

export const USER_B: MockUser = {
  _id: "users:userB",
  email: "userB@test.com",
  role: "USER",
  createdAt: 1001,
};

export const USER_C: MockUser = {
  _id: "users:userC",
  email: "userC@test.com",
  role: "USER",
  createdAt: 1002,
};

export const CASE_ID = "cases:case1";

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

export const CASE_JOINT_ACTIVE_SOLO = {
  ...CASE_JOINT_ACTIVE,
  isSolo: true,
  inviteeUserId: USER_A._id,
};

export const PARTY_STATE_A = {
  _id: "partyStates:psA",
  caseId: CASE_ID,
  userId: USER_A._id,
  role: "INITIATOR" as const,
  closureProposed: false,
  closureConfirmed: false,
};

export const PARTY_STATE_B = {
  _id: "partyStates:psB",
  caseId: CASE_ID,
  userId: USER_B._id,
  role: "INVITEE" as const,
  closureProposed: false,
  closureConfirmed: false,
};

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
 * Convex wraps handlers in an object; this unwraps it.
 */
export function getHandler(
  fn: Record<string, unknown> | ((...args: unknown[]) => unknown),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): (...args: any[]) => any {
  return typeof fn === "function"
    ? fn
    : (fn.handler as (...args: unknown[]) => unknown);
}

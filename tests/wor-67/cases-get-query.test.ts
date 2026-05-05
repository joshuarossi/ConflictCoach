/**
 * WOR-67: cases/get query integration tests
 *
 * Covers:
 * - AC: CaseDetail reads case status via cases/get query
 * - AC: 404 if case not found or user is not a party to the case (FORBIDDEN error)
 *
 * These tests verify the backend query logic by invoking the handler
 * with a mock context, following the same pattern as wor-52 tests.
 */
import { describe, test, expect, vi } from "vitest";
import { ConvexError } from "convex/values";

const USER_A_ID = "users:userA";
const USER_B_ID = "users:userB";
const USER_C_ID = "users:userC";
const CASE_ID = "cases:case1";

const CASE_DOC = {
  _id: CASE_ID,
  status: "BOTH_PRIVATE_COACHING",
  initiatorUserId: USER_A_ID,
  inviteeUserId: USER_B_ID,
  category: "workplace",
  isSolo: false,
  createdAt: 1000,
  updatedAt: 2000,
};

// Mock the auth helper before importing the module under test
vi.mock("../../convex/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

import { get } from "../../convex/cases";
import { requireAuth } from "../../convex/lib/auth";

const mockedRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

/**
 * Extract the handler function from a Convex function definition.
 * Convex wraps handlers in an object with various shapes depending on version.
 */
function getHandler(fn: any): (ctx: any, args: any) => Promise<any> {
  if (typeof fn === "function") return fn;
  if (typeof fn?.handler === "function") return fn.handler;
  for (const key of Object.keys(fn ?? {})) {
    if (typeof fn[key] === "function") return fn[key];
    if (typeof fn[key]?.handler === "function") return fn[key].handler;
  }
  throw new Error(`Cannot extract handler from: ${JSON.stringify(Object.keys(fn ?? {}))}`);
}

function createMockCtx(dbGetMap: Record<string, unknown>) {
  return {
    db: {
      get: vi.fn(async (id: string) => dbGetMap[id] ?? null),
    },
  };
}

describe("AC: cases/get returns case data for authorized party", () => {
  test("returns the full case document when user is the initiator", async () => {
    mockedRequireAuth.mockResolvedValueOnce({ _id: USER_A_ID, email: "a@test.com", role: "USER" });
    const ctx = createMockCtx({ [CASE_ID]: CASE_DOC });

    const handler = getHandler(get);
    const result = await handler(ctx, { caseId: CASE_ID });
    expect(result).toEqual(CASE_DOC);
  });

  test("returns the full case document when user is the invitee", async () => {
    mockedRequireAuth.mockResolvedValueOnce({ _id: USER_B_ID, email: "b@test.com", role: "USER" });
    const ctx = createMockCtx({ [CASE_ID]: CASE_DOC });

    const handler = getHandler(get);
    const result = await handler(ctx, { caseId: CASE_ID });
    expect(result).toEqual(CASE_DOC);
  });
});

describe("AC: 404/FORBIDDEN if case not found or user is not a party", () => {
  test("returns null when case does not exist", async () => {
    mockedRequireAuth.mockResolvedValueOnce({ _id: USER_A_ID, email: "a@test.com", role: "USER" });
    const ctx = createMockCtx({});

    const handler = getHandler(get);
    const result = await handler(ctx, { caseId: "nonexistent" });
    expect(result).toBeNull();
  });

  test("throws FORBIDDEN when user is not a party to the case", async () => {
    mockedRequireAuth.mockResolvedValueOnce({ _id: USER_C_ID, email: "c@test.com", role: "USER" });
    const ctx = createMockCtx({ [CASE_ID]: CASE_DOC });

    const handler = getHandler(get);
    await expect(handler(ctx, { caseId: CASE_ID })).rejects.toThrow(ConvexError);
  });
});

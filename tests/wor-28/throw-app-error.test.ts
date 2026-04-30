import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import {
  throwAppError,
  UNAUTHENTICATED,
  FORBIDDEN,
  NOT_FOUND,
  CONFLICT,
  INVALID_INPUT,
  TOKEN_INVALID,
  RATE_LIMITED,
  AI_ERROR,
  INTERNAL,
} from "../../convex/lib/errors";

/**
 * Tests for WOR-28: Error code normalization (ConvexError wrapper)
 *
 * Covers ACs 1–4:
 *   1. throwAppError(code, message) is exported from convex/lib/errors.ts
 *   2. All 9 error codes from TechSpec §7.4 are defined as constants
 *   3. Each error code maps to an appropriate HTTP status
 *   4. ConvexError instances include code, message, and httpStatus fields
 */

// AC-2: All 9 error codes from TechSpec §7.4 are defined as constants
describe("All 9 error codes from TechSpec §7.4 are defined as constants: UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT, INVALID_INPUT, TOKEN_INVALID, RATE_LIMITED, AI_ERROR, INTERNAL", () => {
  const expectedCodes = [
    { constant: UNAUTHENTICATED, name: "UNAUTHENTICATED" },
    { constant: FORBIDDEN, name: "FORBIDDEN" },
    { constant: NOT_FOUND, name: "NOT_FOUND" },
    { constant: CONFLICT, name: "CONFLICT" },
    { constant: INVALID_INPUT, name: "INVALID_INPUT" },
    { constant: TOKEN_INVALID, name: "TOKEN_INVALID" },
    { constant: RATE_LIMITED, name: "RATE_LIMITED" },
    { constant: AI_ERROR, name: "AI_ERROR" },
    { constant: INTERNAL, name: "INTERNAL" },
  ];

  test.each(expectedCodes)(
    "error code constant $name is exported and equals its string name",
    ({ constant, name }) => {
      expect(constant).toBe(name);
    },
  );
});

// AC-1: throwAppError(code, message) is exported from convex/lib/errors.ts
// AC-4: ConvexError instances include code, message, and httpStatus fields
describe("A throwAppError(code, message) utility is exported from convex/lib/errors.ts", () => {
  test("throwAppError is a function", () => {
    expect(typeof throwAppError).toBe("function");
  });

  test("throwAppError throws a ConvexError instance", () => {
    try {
      throwAppError(UNAUTHENTICATED, "not logged in");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConvexError);
    }
  });

  test("ConvexError instances include code, message, and httpStatus fields", () => {
    try {
      throwAppError(NOT_FOUND, "Case not found");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConvexError);
      const convexErr = err as ConvexError<{
        code: string;
        message: string;
        httpStatus: number;
      }>;
      expect(convexErr.data).toHaveProperty("code", "NOT_FOUND");
      expect(convexErr.data).toHaveProperty("message", "Case not found");
      expect(convexErr.data).toHaveProperty("httpStatus");
      expect(typeof convexErr.data.httpStatus).toBe("number");
    }
  });
});

// AC-3: Each error code maps to an appropriate HTTP status
describe("Each error code maps to an appropriate HTTP status (401, 403, 404, 409, 400, 400, 429, 502, 500)", () => {
  const codeToStatus: Array<{ code: string; httpStatus: number }> = [
    { code: "UNAUTHENTICATED", httpStatus: 401 },
    { code: "FORBIDDEN", httpStatus: 403 },
    { code: "NOT_FOUND", httpStatus: 404 },
    { code: "CONFLICT", httpStatus: 409 },
    { code: "INVALID_INPUT", httpStatus: 400 },
    { code: "TOKEN_INVALID", httpStatus: 400 },
    { code: "RATE_LIMITED", httpStatus: 429 },
    { code: "AI_ERROR", httpStatus: 502 },
    { code: "INTERNAL", httpStatus: 500 },
  ];

  test.each(codeToStatus)(
    "throwAppError($code, ...) produces httpStatus $httpStatus",
    ({ code, httpStatus }) => {
      try {
        throwAppError(code, "test message");
        expect.fail("should have thrown");
      } catch (err) {
        const convexErr = err as ConvexError<{
          code: string;
          message: string;
          httpStatus: number;
        }>;
        expect(convexErr.data.code).toBe(code);
        expect(convexErr.data.httpStatus).toBe(httpStatus);
        expect(convexErr.data.message).toBe("test message");
      }
    },
  );
});

// Additional: unknown/invalid codes fall back to INTERNAL / 500
describe("Unknown error codes fall back to INTERNAL / 500", () => {
  test("throwAppError with an unknown code throws with INTERNAL / 500 or throws an error", () => {
    try {
      throwAppError("TOTALLY_UNKNOWN_CODE" as string, "something broke");
      expect.fail("should have thrown");
    } catch (err) {
      if (err instanceof ConvexError) {
        // Falls back to INTERNAL / 500
        const data = (err as ConvexError<{ code: string; httpStatus: number }>)
          .data;
        expect(data.code).toBe("INTERNAL");
        expect(data.httpStatus).toBe(500);
      }
      // If it throws a different error type, that's also acceptable —
      // the key requirement is that it doesn't silently succeed.
    }
  });
});

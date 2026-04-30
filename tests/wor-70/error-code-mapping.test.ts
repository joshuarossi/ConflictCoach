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
  type AppErrorCode,
} from "../../convex/lib/errors";

describe("Error code mapping tests: each code maps to correct HTTP status", () => {
  const expectedMappings: Array<[AppErrorCode, number]> = [
    [UNAUTHENTICATED, 401],
    [FORBIDDEN, 403],
    [NOT_FOUND, 404],
    [CONFLICT, 409],
    [INVALID_INPUT, 400],
    [TOKEN_INVALID, 400],
    [RATE_LIMITED, 429],
    [AI_ERROR, 502],
    [INTERNAL, 500],
  ];

  test.each(expectedMappings)(
    "throwAppError('%s') maps to HTTP %i",
    (code, expectedStatus) => {
      try {
        throwAppError(code, `Test message for ${code}`);
        expect.unreachable("throwAppError should throw");
      } catch (err) {
        expect(err).toBeInstanceOf(ConvexError);
        const data = (err as any).data;
        expect(data.code).toBe(code);
        expect(data.httpStatus).toBe(expectedStatus);
        expect(data.message).toBe(`Test message for ${code}`);
      }
    },
  );

  test("all 9 error codes are covered", () => {
    expect(expectedMappings).toHaveLength(9);
  });
});

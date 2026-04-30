import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import { parseConvexError } from "../../src/lib/errors";

/**
 * Tests for WOR-28: Client-side error parsing utility
 *
 * Covers AC-5:
 *   Client-side error parsing utility extracts code and message from ConvexError responses
 */

describe("Client-side error parsing utility extracts code and message from ConvexError responses", () => {
  test("parseConvexError is a function exported from src/lib/errors", () => {
    expect(typeof parseConvexError).toBe("function");
  });

  test("given a ConvexError with { code, message, httpStatus }, parser extracts code and message", () => {
    // Convex surfaces ConvexError data on the client via error.data.
    // Simulate what a client would receive.
    const error = new ConvexError({
      code: "NOT_FOUND",
      message: "Case not found",
      httpStatus: 404,
    });

    const parsed = parseConvexError(error);

    expect(parsed.code).toBe("NOT_FOUND");
    expect(parsed.message).toBe("Case not found");
  });

  test("given a plain Error (non-ConvexError), parser returns a sensible fallback", () => {
    const error = new Error("something went wrong");

    const parsed = parseConvexError(error);

    expect(parsed.code).toBe("INTERNAL");
    expect(typeof parsed.message).toBe("string");
    expect(parsed.message.length).toBeGreaterThan(0);
  });

  test("given an unknown/arbitrary object, parser returns a sensible fallback", () => {
    const error = { unexpected: "shape" };

    const parsed = parseConvexError(error);

    expect(parsed.code).toBe("INTERNAL");
    expect(typeof parsed.message).toBe("string");
    expect(parsed.message.length).toBeGreaterThan(0);
  });

  test("parser handles ConvexError with all 9 error codes correctly", () => {
    const codes = [
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "INVALID_INPUT",
      "TOKEN_INVALID",
      "RATE_LIMITED",
      "AI_ERROR",
      "INTERNAL",
    ] as const;

    for (const code of codes) {
      const error = new ConvexError({
        code,
        message: `test ${code}`,
        httpStatus: 500,
      });
      const parsed = parseConvexError(error);
      expect(parsed.code).toBe(code);
      expect(parsed.message).toBe(`test ${code}`);
    }
  });
});

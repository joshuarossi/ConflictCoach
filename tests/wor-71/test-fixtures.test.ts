import { describe, test, expect } from "vitest";

/**
 * WOR-71 AC: Test fixtures: createTestUser, loginAsUser, createTestCase helpers
 *
 * The fixture module exports Playwright-compatible test helpers for E2E tests.
 * This module does not exist yet — it is part of the WOR-71 implementation.
 */

// @ts-expect-error WOR-71 red-state import: implementation is created by task-implement.
import { createTestUser, loginAsUser, createTestCase } from "../../e2e/fixtures";

describe("AC: Test fixtures — createTestUser, loginAsUser, createTestCase helpers", () => {
  test("createTestUser is exported as a function", () => {
    expect(typeof createTestUser).toBe("function");
  });

  test("loginAsUser is exported as a function", () => {
    expect(typeof loginAsUser).toBe("function");
  });

  test("createTestCase is exported as a function", () => {
    expect(typeof createTestCase).toBe("function");
  });
});

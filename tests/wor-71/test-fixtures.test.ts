/**
 * WOR-71: Unit tests verifying the test fixture helpers exist and have
 * the correct signatures.
 *
 * Covers:
 * - AC5: Test fixtures: createTestUser, loginAsUser, createTestCase helpers
 *
 * These tests import the fixture module that WOR-71 will create at
 * e2e/fixtures.ts. Until that file exists, the imports will fail — which
 * is the correct "red" state.
 */

import { describe, test, expect } from "vitest";

// The fixture module that WOR-71 must create.
// This import will fail until e2e/fixtures.ts exists.
import {
  createTestUser,
  loginAsUser,
  createTestCase,
} from "../../e2e/fixtures";

// ---------------------------------------------------------------------------
// AC5: Test fixtures: createTestUser, loginAsUser, createTestCase helpers
// ---------------------------------------------------------------------------

describe("AC5: Test fixtures: createTestUser, loginAsUser, createTestCase helpers", () => {
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

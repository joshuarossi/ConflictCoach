/**
 * Unit tests for audit action constants (WOR-61, AC2)
 *
 * AC2: All admin template mutations call writeAuditLog with appropriate action
 *      strings (TEMPLATE_CREATED, TEMPLATE_PUBLISHED, TEMPLATE_ARCHIVED).
 *
 * This file tests that action string constants are defined and exported.
 * The integration behavior (mutations calling writeAuditLog) is verified
 * in the template-mutations-audit.test.ts file.
 *
 * These tests will FAIL until the implementation exists.
 * Once implemented, update the import path from ./__stubs__/audit to
 * ../../convex/lib/audit.
 */
import { describe, test, expect } from "vitest";
import { AUDIT_ACTIONS } from "./__stubs__/audit";

// ---------------------------------------------------------------------------
// AC2: Action string constants are defined
// ---------------------------------------------------------------------------
describe("AC2: AUDIT_ACTIONS constants are exported", () => {
  test("AUDIT_ACTIONS object is exported", () => {
    expect(AUDIT_ACTIONS).toBeDefined();
    expect(typeof AUDIT_ACTIONS).toBe("object");
  });

  test("TEMPLATE_CREATED action constant is defined", () => {
    expect(AUDIT_ACTIONS.TEMPLATE_CREATED).toBe("TEMPLATE_CREATED");
  });

  test("TEMPLATE_PUBLISHED action constant is defined", () => {
    expect(AUDIT_ACTIONS.TEMPLATE_PUBLISHED).toBe("TEMPLATE_PUBLISHED");
  });

  test("TEMPLATE_ARCHIVED action constant is defined", () => {
    expect(AUDIT_ACTIONS.TEMPLATE_ARCHIVED).toBe("TEMPLATE_ARCHIVED");
  });
});

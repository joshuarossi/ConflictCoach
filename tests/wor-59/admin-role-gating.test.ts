/**
 * WOR-59 AC1: Admin role gating
 *
 * All admin mutations/queries verify user.role === 'ADMIN';
 * throw FORBIDDEN otherwise.
 */
import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import {
  createMockContext,
  callHandler,
  ADMIN_USER,
  REGULAR_USER,
} from "./helpers";

import {
  createTemplate,
  publishNewVersion,
  archiveTemplate,
  listAllTemplates,
  listTemplateVersions,
} from "../../convex/templates";

// ---------------------------------------------------------------------------
// Helper to assert FORBIDDEN error
// ---------------------------------------------------------------------------
async function expectForbidden(fn: () => Promise<unknown>) {
  try {
    await fn();
    expect.fail("Expected FORBIDDEN error but call succeeded");
  } catch (err) {
    expect(err).toBeInstanceOf(ConvexError);
    const data = (err as ConvexError<{ code: string; httpStatus: number }>)
      .data;
    expect(data.code).toBe("FORBIDDEN");
    expect(data.httpStatus).toBe(403);
  }
}

// ---------------------------------------------------------------------------
// Tests: non-admin users are rejected
// ---------------------------------------------------------------------------
describe("AC1: Admin role gating — non-admin users get FORBIDDEN", () => {
  test("createTemplate rejects non-admin user", async () => {
    const { ctx } = createMockContext({
      identity: { email: REGULAR_USER.email },
      users: [REGULAR_USER],
    });

    await expectForbidden(() =>
      callHandler(createTemplate, ctx, {
        category: "workplace",
        name: "Test Template",
        globalGuidance: "Some guidance",
      }),
    );
  });

  test("publishNewVersion rejects non-admin user", async () => {
    const { ctx } = createMockContext({
      identity: { email: REGULAR_USER.email },
      users: [REGULAR_USER],
    });

    await expectForbidden(() =>
      callHandler(publishNewVersion, ctx, {
        templateId: "templates_1",
        globalGuidance: "Updated guidance",
      }),
    );
  });

  test("archiveTemplate rejects non-admin user", async () => {
    const { ctx } = createMockContext({
      identity: { email: REGULAR_USER.email },
      users: [REGULAR_USER],
    });

    await expectForbidden(() =>
      callHandler(archiveTemplate, ctx, { templateId: "templates_1" }),
    );
  });

  test("listAllTemplates rejects non-admin user", async () => {
    const { ctx } = createMockContext({
      identity: { email: REGULAR_USER.email },
      users: [REGULAR_USER],
    });

    await expectForbidden(() => callHandler(listAllTemplates, ctx, {}));
  });

  test("listTemplateVersions rejects non-admin user", async () => {
    const { ctx } = createMockContext({
      identity: { email: REGULAR_USER.email },
      users: [REGULAR_USER],
    });

    await expectForbidden(() =>
      callHandler(listTemplateVersions, ctx, { templateId: "templates_1" }),
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: admin users succeed (no FORBIDDEN)
// ---------------------------------------------------------------------------
describe("AC1: Admin role gating — admin users are allowed", () => {
  test("createTemplate succeeds for admin user", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const result = await callHandler(createTemplate, ctx, {
      category: "workplace",
      name: "Admin Template",
      globalGuidance: "Admin guidance",
    });

    expect(result).toBeDefined();
  });

  test("listAllTemplates succeeds for admin user", async () => {
    const { ctx } = createMockContext({
      identity: { email: ADMIN_USER.email },
      users: [ADMIN_USER],
    });

    const result = await callHandler(listAllTemplates, ctx, {});
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: unauthenticated users are rejected
// ---------------------------------------------------------------------------
describe("AC1: Admin role gating — unauthenticated users are rejected", () => {
  test("createTemplate rejects unauthenticated caller", async () => {
    const { ctx } = createMockContext({
      identity: null,
    });

    await expect(
      callHandler(createTemplate, ctx, {
        category: "workplace",
        name: "Test",
        globalGuidance: "Guidance",
      }),
    ).rejects.toThrow();
  });
});

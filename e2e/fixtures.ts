/**
 * E2E test fixtures (WOR-71).
 *
 * These helpers seed test data and authenticate Playwright browser contexts
 * without going through the email/OAuth UI. They rely on:
 *   - convex/testSupport.ts mutations (gated on CLAUDE_MOCK=true)
 *   - convex/auth.ts test-mode Password provider (gated on CLAUDE_MOCK=true)
 *
 * Usage in a Playwright spec:
 *   const user = await createTestUser(page);
 *   await loginAsUser(page, user);
 *   const caseId = await createTestCase(page, user);
 */
import type { Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  name: string;
}

export interface TestCase {
  caseId: string;
  category: string;
  isSolo: boolean;
  /** Initial case status — always DRAFT_PRIVATE_COACHING from createCaseForEmail. */
  status: "DRAFT_PRIVATE_COACHING";
  /** Invite token for two-party cases. Undefined for solo cases. */
  inviteToken?: string;
}

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Seeds a fresh test user. Returns credentials usable with loginAsUser.
 *
 * The user row is created lazily on first sign-in via the test-mode Password
 * provider — we don't insert it directly. This keeps the fixture portable
 * across local dev and CI.
 */
export async function createTestUser(_page?: Page): Promise<TestUser> {
  // _page is accepted for API symmetry with the other fixtures (which all
  // take `page` first) but is unused — user creation is purely deterministic
  // string generation. The Convex user row gets inserted lazily on first
  // sign-in via the test-mode Password provider.
  void _page;
  const suffix = uniqueSuffix();
  return {
    email: `e2e-${suffix}@test.local`,
    password: `Test-${suffix}-password`,
    name: `E2E User ${suffix}`,
  };
}

/**
 * Seeds the admin user (admin@conflictcoach.dev) via the seed mutation and
 * returns credentials for login. The seed mutation is idempotent — safe to
 * call multiple times. Requires test hooks to be mounted, so the page must
 * have navigated to at least "/" first (handled by loginAsUser).
 */
export async function createTestAdminUser(page: Page): Promise<TestUser> {
  // Navigate so test hooks mount (callMutation needs them)
  await page.goto("/");
  await page.waitForFunction(
    () =>
      (window as unknown as { __TEST_CALL_MUTATION__?: unknown })
        .__TEST_CALL_MUTATION__ !== undefined,
    null,
    { timeout: 10000 },
  );
  // Seed ensures admin@conflictcoach.dev exists with role ADMIN
  await callMutation(page, "seed:seed", {});
  return {
    email: "admin@conflictcoach.dev",
    password: "admin-test-password",
    name: "Admin",
  };
}

/**
 * Authenticates the Playwright browser context as the given user via the
 * test-mode Password provider. After this resolves, subsequent navigation
 * sees the user as signed in.
 */
export async function loginAsUser(page: Page, user: TestUser): Promise<void> {
  await page.goto("/");
  // TestHooksMount installs window.__TEST_SIGN_IN__ from a useEffect that
  // fires after React commit, behind a lazy() Suspense boundary. Wait for
  // the hook to be ready so cold-server runs don't race the mount.
  await page.waitForFunction(
    () =>
      (window as unknown as { __TEST_SIGN_IN__?: unknown }).__TEST_SIGN_IN__ !==
      undefined,
    null,
    { timeout: 10000 },
  );
  // Drive the Convex Auth Password sign-in directly via the global window
  // hook the app exposes. The app's main.tsx wires `useAuthActions().signIn`
  // through ConvexAuthProvider, so we navigate to a dedicated test sign-in
  // route that calls signIn("test-password", {...}).
  await page.evaluate(async ({ email, password, name }) => {
    const w = window as unknown as {
      __TEST_SIGN_IN__?: (args: {
        email: string;
        password: string;
        name: string;
      }) => Promise<void>;
    };
    if (!w.__TEST_SIGN_IN__) {
      throw new Error(
        "Test sign-in hook __TEST_SIGN_IN__ not found on window. " +
          "Ensure CLAUDE_MOCK=true and the test sign-in shim is mounted.",
      );
    }
    await w.__TEST_SIGN_IN__({ email, password, name });
  }, user);
  // Wait for the post-login UI to render. Dashboard route or any
  // authenticated landing page should be visible.
  await page.waitForLoadState("networkidle");
}

/**
 * Creates a case for the given user via the test-support mutation.
 * Returns the new case's id and a few fields that callers may want to
 * assert on.
 */
export async function createTestCase(
  page: Page,
  user: TestUser,
  overrides: { category?: string; isSolo?: boolean } = {},
): Promise<TestCase> {
  const category = overrides.category ?? "workplace";
  const isSolo = overrides.isSolo ?? true;
  // Same race as loginAsUser — the hook is set in a useEffect.
  await page.waitForFunction(
    () =>
      (window as unknown as { __TEST_CREATE_CASE__?: unknown })
        .__TEST_CREATE_CASE__ !== undefined,
    null,
    { timeout: 10000 },
  );
  const result = await page.evaluate(
    async ({ email, category, isSolo }) => {
      const w = window as unknown as {
        __TEST_CREATE_CASE__?: (args: {
          email: string;
          category: string;
          isSolo: boolean;
        }) => Promise<string | { caseId: string; inviteToken?: string }>;
      };
      if (!w.__TEST_CREATE_CASE__) {
        throw new Error(
          "Test case-creation hook __TEST_CREATE_CASE__ not found on window. " +
            "Ensure CLAUDE_MOCK=true and the test case shim is mounted.",
        );
      }
      const res = await w.__TEST_CREATE_CASE__({ email, category, isSolo });
      // Support both legacy (string) and structured ({ caseId, inviteToken }) return shapes
      if (typeof res === "string") {
        return { caseId: res, inviteToken: undefined };
      }
      return res;
    },
    { email: user.email, category, isSolo },
  );
  return {
    caseId: result.caseId,
    category,
    isSolo,
    status: "DRAFT_PRIVATE_COACHING" as const,
    inviteToken: result.inviteToken,
  };
}

/**
 * Calls a Convex mutation via the test window hook and returns the result or
 * a structured error with the ConvexError code.
 *
 * Implementation must wire `window.__TEST_CALL_MUTATION__` in the app's test
 * shim (alongside `__TEST_SIGN_IN__` and `__TEST_CREATE_CASE__`). The hook
 * should forward the call through the real Convex client so that auth and
 * permission checks are exercised.
 */
export async function callMutation(
  page: Page,
  mutation: string,
  args: Record<string, unknown>,
): Promise<
  { ok: true; value: unknown } | { ok: false; code: string; message: string }
> {
  return page.evaluate(
    async ({ mutation, args }) => {
      const w = window as unknown as {
        __TEST_CALL_MUTATION__?: (
          mutation: string,
          args: Record<string, unknown>,
        ) => Promise<unknown>;
      };
      if (!w.__TEST_CALL_MUTATION__) {
        throw new Error(
          "Test mutation hook __TEST_CALL_MUTATION__ not found on window. " +
            "Ensure CLAUDE_MOCK=true and the test shim is mounted.",
        );
      }
      try {
        const value = await w.__TEST_CALL_MUTATION__(mutation, args);
        return { ok: true as const, value };
      } catch (e: unknown) {
        const err = e as { data?: { code?: string }; message?: string };
        return {
          ok: false as const,
          code: err.data?.code ?? "UNKNOWN",
          message: err.message ?? String(e),
        };
      }
    },
    { mutation, args },
  );
}

/**
 * Calls a Convex query via the test window hook and returns the result or
 * a structured error. Unlike callMutation, this uses __TEST_CALL_QUERY__
 * which dispatches through client.query() and can invoke Convex query
 * functions.
 *
 * The app's test shim (src/testHooks.ts) must wire
 * window.__TEST_CALL_QUERY__ alongside the existing mutation hook.
 */
export async function callQuery(
  page: Page,
  query: string,
  args: Record<string, unknown>,
): Promise<
  { ok: true; value: unknown } | { ok: false; code: string; message: string }
> {
  return page.evaluate(
    async ({ query, args }) => {
      const w = window as unknown as {
        __TEST_CALL_QUERY__?: (
          query: string,
          args: Record<string, unknown>,
        ) => Promise<unknown>;
      };
      if (!w.__TEST_CALL_QUERY__) {
        throw new Error(
          "Test query hook __TEST_CALL_QUERY__ not found on window. " +
            "Ensure CLAUDE_MOCK=true and the test shim is mounted. " +
            "See WOR-76: src/testHooks.ts needs a __TEST_CALL_QUERY__ hook " +
            "that dispatches via convex.query().",
        );
      }
      try {
        const value = await w.__TEST_CALL_QUERY__(query, args);
        return { ok: true as const, value };
      } catch (e: unknown) {
        const err = e as { data?: { code?: string }; message?: string };
        return {
          ok: false as const,
          code: err.data?.code ?? "UNKNOWN",
          message: err.message ?? String(e),
        };
      }
    },
    { query, args },
  );
}

/**
 * Advances a case to the given status via the __TEST_ADVANCE_CASE__ window
 * hook exposed in test mode (CLAUDE_MOCK=true). The hook drives the backend
 * test-support mutation that force-transitions case status for E2E scenarios.
 */
export async function advanceCaseToStatus(
  page: Page,
  caseId: string,
  targetStatus: string,
): Promise<void> {
  await page.waitForFunction(
    () =>
      (window as unknown as { __TEST_ADVANCE_CASE__?: unknown })
        .__TEST_ADVANCE_CASE__ !== undefined,
    null,
    { timeout: 10000 },
  );
  await page.evaluate(
    async ({ caseId, targetStatus }) => {
      const w = window as unknown as {
        __TEST_ADVANCE_CASE__?: (args: {
          caseId: string;
          targetStatus: string;
        }) => Promise<void>;
      };
      if (!w.__TEST_ADVANCE_CASE__) {
        throw new Error(
          "Test advance-case hook __TEST_ADVANCE_CASE__ not found on window. " +
            "Ensure CLAUDE_MOCK=true and the test advance shim is mounted.",
        );
      }
      await w.__TEST_ADVANCE_CASE__({ caseId, targetStatus });
    },
    { caseId, targetStatus },
  );
}

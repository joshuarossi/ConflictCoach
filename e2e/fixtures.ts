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
 * Authenticates the Playwright browser context as the given user via the
 * test-mode Password provider. After this resolves, subsequent navigation
 * sees the user as signed in.
 */
export async function loginAsUser(page: Page, user: TestUser): Promise<void> {
  await page.goto("/");
  // Drive the Convex Auth Password sign-in directly via the global window
  // hook the app exposes. The app's main.tsx wires `useAuthActions().signIn`
  // through ConvexAuthProvider, so we navigate to a dedicated test sign-in
  // route that calls signIn("test-password", {...}).
  await page.evaluate(
    async ({ email, password, name }) => {
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
    },
    user,
  );
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
  const caseId = await page.evaluate(
    async ({ email, category, isSolo }) => {
      const w = window as unknown as {
        __TEST_CREATE_CASE__?: (args: {
          email: string;
          category: string;
          isSolo: boolean;
        }) => Promise<string>;
      };
      if (!w.__TEST_CREATE_CASE__) {
        throw new Error(
          "Test case-creation hook __TEST_CREATE_CASE__ not found on window. " +
            "Ensure CLAUDE_MOCK=true and the test case shim is mounted.",
        );
      }
      return await w.__TEST_CREATE_CASE__({ email, category, isSolo });
    },
    { email: user.email, category, isSolo },
  );
  return { caseId, category, isSolo, status: "DRAFT_PRIVATE_COACHING" };
}

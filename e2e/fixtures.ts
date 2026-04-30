/**
 * Reusable Playwright E2E test fixtures for Conflict Coach.
 *
 * Provides helpers to seed test data and authenticate test users
 * without going through the UI's email/OAuth flow.
 *
 * Requires CLAUDE_MOCK=true on the Convex backend.
 */
import { type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Convex deployment URL used by the test harness to call internal mutations. */
const CONVEX_URL = process.env.VITE_CONVEX_URL ?? "http://127.0.0.1:3210";

/**
 * Execute a Convex internal mutation/action from the test harness.
 *
 * This calls the Convex HTTP endpoint directly using the admin key,
 * bypassing the client SDK. For test seeding only.
 */
async function callConvexFunction(
  fnPath: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const adminKey = process.env.CONVEX_ADMIN_KEY;
  const url = `${CONVEX_URL}/api/run`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(adminKey ? { Authorization: `Convex ${adminKey}` } : {}),
    },
    body: JSON.stringify({
      path: fnPath,
      args,
      format: "json",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Convex function ${fnPath} failed (${response.status}): ${text}`);
  }

  const result = await response.json();
  return result.value;
}

// ---------------------------------------------------------------------------
// createTestUser — seed a user directly via Convex
// ---------------------------------------------------------------------------

export interface TestUser {
  id: string;
  userId: string;
  email: string;
  displayName: string;
}

/**
 * Creates a test user directly in the Convex database (not through the UI).
 *
 * @param options.email - Email address for the test user
 * @param options.displayName - Display name (defaults to email prefix)
 * @param options.role - User role, defaults to "USER"
 * @returns The created user's ID and details
 */
export async function createTestUser(options: {
  email?: string;
  displayName?: string;
  role?: "USER" | "ADMIN";
} = {}): Promise<TestUser> {
  const email = options.email ?? `test-${Date.now()}@example.com`;
  const displayName = options.displayName ?? email.split("@")[0];

  const userId = (await callConvexFunction("testSupport:createTestUser", {
    email,
    displayName,
    role: options.role ?? "USER",
  })) as string;

  return { id: userId, userId, email, displayName };
}

// ---------------------------------------------------------------------------
// loginAsUser — authenticate a Playwright browser context as a test user
// ---------------------------------------------------------------------------

/**
 * Authenticates a Playwright page/context as the given test user.
 *
 * This bypasses the email/OAuth flow by injecting an authenticated session
 * directly into the browser's storage state. For Convex Auth, this means
 * setting the auth token that the ConvexReactClient reads on initialization.
 *
 * @param page - Playwright Page to authenticate
 * @param user - TestUser returned by createTestUser
 */
export async function loginAsUser(
  page: Page,
  user: TestUser,
): Promise<void> {
  const baseURL = "http://localhost:5174";

  // Navigate to the app first so we have a page context for localStorage
  await page.goto(baseURL);

  // Set the Convex auth token in localStorage.
  // Convex Auth stores the session token under a key derived from the deployment URL.
  // We inject a mock token that the test Convex backend recognizes.
  await page.evaluate(
    ({ userId, email }) => {
      // Store a test session marker that the mock auth system can validate.
      // In test mode with CLAUDE_MOCK=true, the backend's requireAuth
      // will recognize test tokens set via this mechanism.
      localStorage.setItem(
        "__convexAuthToken",
        JSON.stringify({
          token: `test-token-${userId}`,
          subject: userId,
          email,
        }),
      );
    },
    { userId: user.userId, email: user.email },
  );

  // Reload to pick up the injected auth state
  await page.reload();
}

// ---------------------------------------------------------------------------
// createTestCase — create a case via Convex mutation
// ---------------------------------------------------------------------------

export interface TestCase {
  id: string;
  caseId: string;
  initiatorUserId: string;
}

/**
 * Creates a test case directly in the Convex database.
 *
 * Also creates the required template, template version, and initiator party state.
 *
 * @param options.initiatorUserId - The user who initiates the case
 * @param options.category - Case category (default: "workplace")
 * @param options.isSolo - Whether it's a solo case (default: false)
 * @param options.status - Initial case status (default: "DRAFT_PRIVATE_COACHING")
 * @param options.mainTopic - Topic for the party state form
 * @param options.description - Description for the party state form
 * @param options.desiredOutcome - Desired outcome for the party state form
 * @returns The created case ID
 */
export async function createTestCase(options: {
  initiatorUserId?: string;
  userId?: string;
  category?: string;
  isSolo?: boolean;
  status?: string;
  mainTopic?: string;
  description?: string;
  desiredOutcome?: string;
}): Promise<TestCase> {
  const initiatorUserId = options.initiatorUserId ?? options.userId ?? "";
  const caseId = (await callConvexFunction("testSupport:createTestCase", {
    initiatorUserId,
    category: options.category,
    isSolo: options.isSolo,
    status: options.status,
    mainTopic: options.mainTopic,
    description: options.description,
    desiredOutcome: options.desiredOutcome,
  })) as string;

  return { id: caseId, caseId, initiatorUserId };
}

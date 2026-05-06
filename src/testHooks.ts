/**
 * Browser-side test hooks (WOR-71, extended WOR-75/76).
 *
 * Mounted by main.tsx only when `import.meta.env.VITE_E2E_TEST_MODE === "true"`.
 * Exposes window hooks (`__TEST_*`) so Playwright fixtures (e2e/fixtures.ts)
 * can authenticate, seed data, and call Convex functions without going
 * through the email/OAuth UI.
 *
 * All hooks are no-ops in production builds — Vite tree-shakes the import
 * out when VITE_E2E_TEST_MODE isn't "true".
 */
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";

declare global {
  interface Window {
    __TEST_SIGN_IN__?: (args: {
      email: string;
      password: string;
      name: string;
    }) => Promise<void>;
    __TEST_CREATE_CASE__?: (args: {
      email: string;
      category: string;
      isSolo: boolean;
    }) => Promise<string>;
    __TEST_CALL_MUTATION__?: (
      mutation: string,
      args: Record<string, unknown>,
    ) => Promise<unknown>;
    __TEST_CALL_QUERY__?: (
      query: string,
      args: Record<string, unknown>,
    ) => Promise<unknown>;
  }
}

/**
 * Renders nothing. Side-effect: while mounted, attaches test hooks
 * to `window` so Playwright `page.evaluate` can call them.
 */
export function TestHooksMount(): null {
  const { signIn } = useAuthActions();
  const convex = useConvex();

  useEffect(() => {
    window.__TEST_SIGN_IN__ = async ({ email, password, name }) => {
      // Test-mode Password provider id is "test-password" (see convex/auth.ts).
      // The Password provider's flow=signUp creates the user row on first call
      // and returns a session for it; subsequent calls with the same email use
      // flow=signIn. We try signUp first and fall back to signIn on conflict.
      try {
        await signIn("test-password", {
          email,
          password,
          name,
          flow: "signUp",
        });
      } catch {
        await signIn("test-password", { email, password, flow: "signIn" });
      }
    };

    window.__TEST_CREATE_CASE__ = async ({ email, category, isSolo }) => {
      const caseId = await convex.mutation(
        (api as unknown as Record<string, Record<string, unknown>>)
          .testSupport.createCaseForEmail as never,
        { email, category, isSolo } as never,
      );
      return caseId as unknown as string;
    };

    // Parse "module:function" format, e.g. "jointChat:sendUserMessage"
    // or "invites/redeem:redeem" → api["invites/redeem"]["redeem"]
    function resolveConvexFunc(path: string): unknown {
      const colonIdx = path.indexOf(":");
      if (colonIdx === -1) {
        throw new Error(
          `Invalid path "${path}": expected "module:function" format`,
        );
      }
      const moduleName = path.slice(0, colonIdx);
      const funcName = path.slice(colonIdx + 1);

      const apiAny = api as unknown as Record<
        string,
        Record<string, unknown>
      >;
      const mod = apiAny[moduleName];
      if (!mod) {
        throw new Error(
          `Module "${moduleName}" not found in Convex API`,
        );
      }
      const funcRef = mod[funcName];
      if (!funcRef) {
        throw new Error(
          `Function "${funcName}" not found in module "${moduleName}"`,
        );
      }
      return funcRef;
    }

    window.__TEST_CALL_MUTATION__ = async (
      mutationPath: string,
      args: Record<string, unknown>,
    ) => {
      return await convex.mutation(
        resolveConvexFunc(mutationPath) as never,
        args as never,
      );
    };

    window.__TEST_CALL_QUERY__ = async (
      queryPath: string,
      args: Record<string, unknown>,
    ) => {
      return await convex.query(
        resolveConvexFunc(queryPath) as never,
        args as never,
      );
    };

    return () => {
      delete window.__TEST_SIGN_IN__;
      delete window.__TEST_CREATE_CASE__;
      delete window.__TEST_CALL_MUTATION__;
      delete window.__TEST_CALL_QUERY__;
    };
  }, [signIn, convex]);

  return null;
}

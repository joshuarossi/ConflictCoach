import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

const INVITE_TOKEN_KEY = "conflict_coach_invite_token";

export function SignIn() {
  const { signIn } = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Stash invite token from returnTo param so it survives OAuth redirects
  useEffect(() => {
    const returnTo = searchParams.get("returnTo");
    if (returnTo) {
      const match = returnTo.match(/^\/invite\/(.+)/);
      if (match) {
        localStorage.setItem(INVITE_TOKEN_KEY, match[1]);
      }
    }
  }, [searchParams]);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setPending(true);
    try {
      await signIn("email", { email });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setPending(true);
    try {
      const result = await signIn("google");
      if (result.redirect) {
        window.location.href = result.redirect.toString();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setPending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    const stashedToken = localStorage.getItem(INVITE_TOKEN_KEY);
    if (stashedToken) {
      localStorage.removeItem(INVITE_TOKEN_KEY);
      return <Navigate to={`/invite/${stashedToken}`} replace />;
    }
    const returnTo = searchParams.get("returnTo");
    return <Navigate to={returnTo || "/dashboard"} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-[400px] space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-gray-900">
          Sign in to Conflict Coach
        </h1>

        {submitted ? (
          <p className="text-center text-gray-600">
            Check your email for a magic link to sign in.
          </p>
        ) : (
          <>
            <form onSubmit={handleMagicLink} className="space-y-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                required
              />
              {error && (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Send magic link
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={pending}
              className="w-full rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Continue with Google
            </button>
          </>
        )}

        <p className="text-center text-xs text-gray-500">
          By signing in, you agree to our{" "}
          <a href="/terms" className="underline hover:text-gray-700">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

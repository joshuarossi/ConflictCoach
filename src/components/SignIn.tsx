import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useState, useEffect } from "react";
import { Navigate, useSearchParams } from "react-router-dom";

const INVITE_TOKEN_KEY = "inviteToken";

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
      console.error("Magic-link sign-in failed:", err);
      setError("Failed to send magic link. Please try again.");
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
      console.error("Google sign-in failed:", err);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-text-tertiary">Loading…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    const returnTo = searchParams.get("returnTo");
    // Only allow relative paths (prevent open redirect)
    const safeReturnTo =
      returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : "/dashboard";

    // Prefer explicit returnTo over stale localStorage token
    if (safeReturnTo !== "/dashboard") {
      localStorage.removeItem(INVITE_TOKEN_KEY);
      return <Navigate to={safeReturnTo} replace />;
    }

    const stashedToken = localStorage.getItem(INVITE_TOKEN_KEY);
    if (stashedToken) {
      localStorage.removeItem(INVITE_TOKEN_KEY);
      return <Navigate to={`/invite/${stashedToken}`} replace />;
    }

    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-[400px] space-y-6 rounded-lg border bg-surface p-8 shadow-1">
        <h1 className="text-center text-h1 font-medium text-text-primary">
          Sign in to Conflict Coach
        </h1>

        {submitted ? (
          <p className="text-center text-text-secondary">
            Check your email for a magic link to sign in.
          </p>
        ) : (
          <>
            <form onSubmit={handleMagicLink} className="space-y-4">
              <label htmlFor="email" className="block text-label font-medium text-text-secondary">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border-strong px-3 py-2 text-label focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                required
              />
              {error && (
                <p role="alert" className="text-label text-danger">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-md bg-accent px-4 py-2 text-label font-medium text-accent-on hover:bg-accent-hover disabled:opacity-50"
              >
                Send magic link
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-timestamp uppercase">
                <span className="bg-surface px-2 text-text-tertiary">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={pending}
              className="w-full rounded-md border border-border-default px-4 py-2 text-label font-medium text-text-secondary hover:bg-surface-subtle disabled:opacity-50"
            >
              Continue with Google
            </button>
          </>
        )}

        <p className="text-center text-timestamp text-text-tertiary">
          By signing in, you agree to our{" "}
          <a href="/terms" className="underline hover:text-text-secondary">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-text-secondary">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

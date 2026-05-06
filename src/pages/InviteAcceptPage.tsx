import { useParams, useNavigate, Link } from "react-router-dom";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { parseConvexError } from "@/lib/errors";

const PENDING_INVITE_TOKEN_KEY = "pendingInviteToken";

export function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invite = useQuery(api.invites.getByToken.getByToken, token ? { token } : "skip");
  const redeemMutation = useMutation(api.invites.redeem.redeem);
  const declineMutation = useMutation(api.invites.decline.decline);

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-full max-w-[480px] rounded-lg border bg-surface p-8 shadow-1 text-center">
          <h1 className="text-h1 font-medium text-text-primary mb-4">Invalid Invite Link</h1>
          <p className="text-text-secondary mb-6">This invite link is missing a token.</p>
          <div className="flex flex-col gap-3">
            <Link to="/login" className="text-accent hover:underline">Log in</Link>
            <Link to="/dashboard" className="text-accent hover:underline">Go to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading states
  if (authLoading || invite === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-text-tertiary">Loading…</p>
      </div>
    );
  }

  // --- Error states: invalid or consumed token ---
  if (invite === null || invite.status === "INVALID" || invite.status === "CONSUMED") {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-full max-w-[480px] rounded-lg border bg-surface p-8 shadow-1 text-center">
          <h1 className="text-h1 font-medium text-text-primary mb-4">
            Invite No Longer Available
          </h1>
          <p className="text-text-secondary mb-6">
            This invite link has already been used or is no longer valid.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/login" className="text-accent hover:underline">Log in</Link>
            <Link to="/dashboard" className="text-accent hover:underline">Go to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Logged-out view ---
  if (!isAuthenticated) {
    const handleSignIn = () => {
      localStorage.setItem(PENDING_INVITE_TOKEN_KEY, token);
      navigate(`/login?returnTo=${encodeURIComponent(`/invite/${token}`)}`);
    };

    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-full max-w-[480px] rounded-lg border bg-surface p-8 shadow-1 text-center">
          <h1 className="text-h1 font-medium text-text-primary mb-4">
            {invite.initiatorName} has invited you to work through something together
          </h1>
          <p className="text-text-secondary mb-6">
            Conflict Coach is a guided space for two people to work through a
            disagreement with the help of an AI mediator. Each person gets
            private coaching before a joint conversation.
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full rounded-md bg-accent px-4 py-2 text-label font-medium text-accent-on hover:bg-accent-hover"
          >
            Sign in to continue
          </button>
        </div>
      </div>
    );
  }

  // --- Logged-in + active token view ---
  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const result = await redeemMutation({ token });
      navigate(`/cases/${result.caseId}/form`);
    } catch (err) {
      const parsed = parseConvexError(err);
      setError(parsed.message);
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    setError(null);
    try {
      await declineMutation({ token });
      navigate("/dashboard");
    } catch (err) {
      const parsed = parseConvexError(err);
      setError(parsed.message);
      setDeclining(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      <div className="w-full max-w-[480px] rounded-lg border bg-surface p-8 shadow-1">
        <h1 className="text-h1 font-medium text-text-primary mb-4 text-center">
          {invite.initiatorName} has invited you to work through something together
        </h1>

        <div className="mb-4 space-y-2">
          {invite.mainTopic && (
            <div>
              <span className="text-label font-medium text-text-tertiary">Topic</span>
              <p className="text-text-primary">{invite.mainTopic}</p>
            </div>
          )}
          <div>
            <span className="text-label font-medium text-text-tertiary">Category</span>
            <p className="text-text-primary capitalize">{invite.category}</p>
          </div>
        </div>

        {/* Privacy callout */}
        <div className="rounded-md bg-accent-subtle p-4 mb-6">
          <p className="text-label text-text-primary">
            {invite.initiatorName} wrote this in the shared summary. You&apos;ll
            have your own private space to share your perspective.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-label text-danger mb-4">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting || declining}
            className="w-full rounded-md bg-accent px-4 py-2 text-label font-medium text-accent-on hover:bg-accent-hover disabled:opacity-50"
          >
            {accepting ? "Accepting…" : "Accept"}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={accepting || declining}
            className="w-full rounded-md border border-border-default px-4 py-2 text-label font-medium text-text-secondary hover:bg-surface-subtle disabled:opacity-50"
          >
            {declining ? "Declining…" : "Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}

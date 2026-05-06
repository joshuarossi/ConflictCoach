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
        <div className="w-full max-w-[480px] rounded-lg border bg-white p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Invite Link</h1>
          <p className="text-gray-600 mb-6">This invite link is missing a token.</p>
          <div className="flex flex-col gap-3">
            <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
            <Link to="/dashboard" className="text-blue-600 hover:underline">Go to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading states
  if (authLoading || invite === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  // --- Error states: invalid or consumed token ---
  if (invite.status === "INVALID" || invite.status === "CONSUMED") {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-full max-w-[480px] rounded-lg border bg-white p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invite No Longer Available
          </h1>
          <p className="text-gray-600 mb-6">
            This invite link has already been used or is no longer valid.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/login" className="text-blue-600 hover:underline">Log in</Link>
            <Link to="/dashboard" className="text-blue-600 hover:underline">Go to dashboard</Link>
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
        <div className="w-full max-w-[480px] rounded-lg border bg-white p-8 shadow-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {invite.initiatorName} has invited you to work through something together
          </h1>
          <p className="text-gray-600 mb-6">
            Conflict Coach is a guided space for two people to work through a
            disagreement with the help of an AI mediator. Each person gets
            private coaching before a joint conversation.
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
      navigate(`/cases/${result.caseId}`);
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
      <div className="w-full max-w-[480px] rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          {invite.initiatorName} has invited you to work through something together
        </h1>

        <div className="mb-4 space-y-2">
          {invite.mainTopic && (
            <div>
              <span className="text-sm font-medium text-gray-500">Topic</span>
              <p className="text-gray-900">{invite.mainTopic}</p>
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-gray-500">Category</span>
            <p className="text-gray-900 capitalize">{invite.category}</p>
          </div>
        </div>

        {/* Privacy callout */}
        <div className="rounded-md bg-blue-50 p-4 mb-6">
          <p className="text-sm text-blue-900">
            {invite.initiatorName} wrote this in the shared summary. You&apos;ll
            have your own private space to share your perspective.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 mb-4">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting || declining}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {accepting ? "Accepting…" : "Accept"}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={accepting || declining}
            className="w-full rounded-md border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {declining ? "Declining…" : "Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}

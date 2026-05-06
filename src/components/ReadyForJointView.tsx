import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import ReactMarkdown from "react-markdown";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNetworkErrorToast } from "@/hooks/useNetworkErrorToast";

// ---------------------------------------------------------------------------
// Props-based presentational component (used directly by unit tests)
// ---------------------------------------------------------------------------

export interface ReadyForJointViewProps {
  synthesisText: string | null;
  otherPartyName: string;
  onEnterJointSession: () => void;
  isEntering?: boolean;
}

export function ReadyForJointView({
  synthesisText,
  otherPartyName,
  onEnterJointSession,
  isEntering = false,
}: ReadyForJointViewProps) {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-8">
      {/* Synthesis card with private-tint background */}
      <div
        className="rounded-lg p-6"
        style={{ backgroundColor: "var(--private-tint)" }}
        data-testid="synthesis-card"
      >
        {/* Privacy indicator */}
        <div className="mb-4 flex items-center gap-2">
          <Lock size={16} strokeWidth={1.5} aria-label="Private" />
          <span className="text-sm text-text-secondary">
            Private to you — {otherPartyName} has their own version
          </span>
        </div>

        {/* Synthesis text rendered as markdown */}
        <div className="prose prose-sm max-w-none text-text-primary">
          {synthesisText ? (
            <ReactMarkdown>{synthesisText}</ReactMarkdown>
          ) : (
            <p className="text-text-secondary">No synthesis available yet.</p>
          )}
        </div>
      </div>

      {/* Enter Joint Session CTA */}
      <div className="mt-8 flex flex-col items-center gap-3">
        <Button
          size="lg"
          onClick={onEnterJointSession}
          disabled={isEntering}
          className="w-full max-w-xs"
        >
          {isEntering ? "Entering…" : "Enter Joint Session"}
        </Button>

        <p className="text-sm text-text-secondary">
          {otherPartyName} will see you&apos;ve entered when they enter too.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connected wrapper — uses Convex hooks, renders at /cases/:id/ready
// ---------------------------------------------------------------------------

export function ConnectedReadyForJointView() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const typedCaseId = caseId as Id<"cases">;

  const caseData = useQuery(api.cases.get, { caseId: typedCaseId });
  const partyData = useQuery(api.cases.partyStates, { caseId: typedCaseId });
  const synthesisData = useQuery(api.jointChat.mySynthesis, {
    caseId: typedCaseId,
  });

  const enterJointSession = useMutation(api.jointChat.enterJointSession);
  const showNetworkError = useNetworkErrorToast();
  const [isEntering, setIsEntering] = useState(false);

  const handleEnterJointSession = useCallback(async () => {
    setIsEntering(true);
    try {
      await enterJointSession({ caseId: typedCaseId });
      navigate(`/cases/${caseId}/joint`);
    } catch (err) {
      showNetworkError(
        err instanceof Error ? err.message : "Failed to enter joint session",
      );
      setIsEntering(false);
    }
  }, [enterJointSession, typedCaseId, caseId, navigate, showNetworkError]);

  // Loading state
  if (
    caseData === undefined ||
    partyData === undefined ||
    synthesisData === undefined
  ) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="mx-auto h-10 w-48" />
      </div>
    );
  }

  if (caseData === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary">Case not found.</p>
      </div>
    );
  }

  // Redirect if case is no longer READY_FOR_JOINT
  if (caseData.status === "JOINT_ACTIVE") {
    navigate(`/cases/${caseId}/joint`, { replace: true });
    return null;
  }

  if (caseData.status !== "READY_FOR_JOINT") {
    navigate(`/cases/${caseId}`, { replace: true });
    return null;
  }

  const otherPartyName =
    partyData?.otherPhaseOnly?.displayName ??
    partyData?.otherPartyName ??
    "the other party";

  return (
    <ReadyForJointView
      synthesisText={synthesisData?.synthesisText ?? null}
      otherPartyName={otherPartyName}
      onEnterJointSession={handleEnterJointSession}
      isEntering={isEntering}
    />
  );
}

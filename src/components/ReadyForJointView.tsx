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
// ReadyForJointView — accepts caseId, fetches synthesis + other party name
// ---------------------------------------------------------------------------

export interface ReadyForJointViewProps {
  caseId: string;
  otherPartyName?: string;
}

export function ReadyForJointView({ caseId, otherPartyName: otherPartyNameProp }: ReadyForJointViewProps) {
  const navigate = useNavigate();
  const typedCaseId = caseId as Id<"cases">;

  // Read otherPartyName from cases.get (the canonical source — same
  // convention as ClosedCasePage and other case-context views). Falls
  // back to the optional prop, then to a generic placeholder.
  const caseData = useQuery(api.cases.get, { caseId: typedCaseId });

  const synthesisData = useQuery(api.jointChat.mySynthesis, {
    caseId: typedCaseId,
  });

  const enterJointSessionMutation = useMutation(
    api.jointChat.enterJointSession,
  );
  const showNetworkError = useNetworkErrorToast();
  const [isEntering, setIsEntering] = useState(false);

  const handleEnterJointSession = useCallback(async () => {
    setIsEntering(true);
    try {
      await enterJointSessionMutation({ caseId: typedCaseId });
      navigate(`/cases/${caseId}/joint`);
    } catch (err) {
      showNetworkError(
        err instanceof Error ? err.message : "Failed to enter joint session",
      );
      setIsEntering(false);
    }
  }, [enterJointSessionMutation, typedCaseId, caseId, navigate, showNetworkError]);

  // Loading state
  if (synthesisData === undefined) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-8 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="mx-auto h-10 w-48" />
      </div>
    );
  }

  const synthesisText = synthesisData?.synthesisText ?? null;
  const otherPartyName =
    otherPartyNameProp ??
    (caseData as { otherPartyName?: string } | null | undefined)?.otherPartyName ??
    synthesisData?.otherPartyName ??
    "the other party";

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
          <span className="text-label text-text-secondary">
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
          onClick={handleEnterJointSession}
          disabled={isEntering}
          className="w-full max-w-xs"
        >
          {isEntering ? "Entering\u2026" : "Enter Joint Session"}
        </Button>

        <p className="text-label text-text-secondary">
          {otherPartyName} will see you&apos;ve entered when they enter too.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connected wrapper — extracts caseId from URL params for route rendering
// ---------------------------------------------------------------------------

export function ConnectedReadyForJointView() {
  const { caseId } = useParams<{ caseId: string }>();
  const typedCaseId = caseId as Id<"cases">;

  return <ReadyForJointView caseId={typedCaseId} />;
}

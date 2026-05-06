import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ConvexErrorBoundary } from "@/components/layout/ConvexErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Maps a case status to a human-readable phase name for display.
 */
function getPhaseLabel(status: string): string {
  switch (status) {
    case "DRAFT_PRIVATE_COACHING":
    case "BOTH_PRIVATE_COACHING":
      return "Private Coaching";
    case "READY_FOR_JOINT":
      return "Ready for Joint";
    case "JOINT_ACTIVE":
      return "Joint Chat";
    case "CLOSED_RESOLVED":
      return "Closed — Resolved";
    case "CLOSED_UNRESOLVED":
      return "Closed — Unresolved";
    case "CLOSED_ABANDONED":
      return "Closed — Abandoned";
    default:
      return status;
  }
}

function CaseDetailSkeleton() {
  return (
    <div className="space-y-6" data-testid="case-detail-skeleton">
      <Skeleton className="h-8 w-48" />
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}

function NotFoundView() {
  return (
    <div
      className="flex flex-col items-center justify-center py-24 px-4"
      data-testid="case-not-found"
    >
      <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-lg text-gray-600">Case not found.</p>
      <Link
        to="/dashboard"
        className="mt-4 text-blue-600 hover:text-blue-800 underline"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

function PrivateCoachingSubView({ caseId }: { caseId: string }) {
  return (
    <div data-testid="private-coaching-view" className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Private Coaching</h2>
      <p className="text-gray-600">
        You are in the private coaching phase. Work with your AI coach to
        prepare for the joint conversation.
      </p>
      <Link
        to={`/cases/${caseId}/private`}
        className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Continue Private Coaching
      </Link>
    </div>
  );
}

function ReadyForJointSubView({ caseId }: { caseId: string }) {
  return (
    <div data-testid="ready-for-joint-view" className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">
        Ready for Joint Session
      </h2>
      <p className="text-gray-600">
        Both parties have completed private coaching. The joint session is ready
        to begin.
      </p>
      <Link
        to={`/cases/${caseId}/joint`}
        className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Start Joint Chat
      </Link>
    </div>
  );
}

function JointChatSubView({ caseId }: { caseId: string }) {
  return (
    <div data-testid="joint-chat-view" className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Joint Chat</h2>
      <p className="text-gray-600">
        The joint conversation is active. Continue the facilitated discussion.
      </p>
      <Link
        to={`/cases/${caseId}/joint`}
        className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Continue Joint Chat
      </Link>
    </div>
  );
}

function ClosedCaseSubView({ status }: { status: string }) {
  return (
    <div data-testid="closed-case-view" className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Case Closed</h2>
      <p className="text-gray-600">{getPhaseLabel(status)}</p>
      <Link
        to="/dashboard"
        className="inline-block rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

function CaseDetailContent() {
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const caseId = caseIdParam as Id<"cases">;

  const caseData = useQuery(api.cases.get, { caseId });

  // Loading state
  if (caseData === undefined) {
    return <CaseDetailSkeleton />;
  }

  // Not found
  if (caseData === null) {
    return <NotFoundView />;
  }

  const status = caseData.status as string;

  // Route to the correct sub-view based on case status
  function renderSubView() {
    switch (status) {
      case "DRAFT_PRIVATE_COACHING":
      case "BOTH_PRIVATE_COACHING":
        return <PrivateCoachingSubView caseId={caseIdParam!} />;
      case "READY_FOR_JOINT":
        return <ReadyForJointSubView caseId={caseIdParam!} />;
      case "JOINT_ACTIVE":
        return <JointChatSubView caseId={caseIdParam!} />;
      case "CLOSED_RESOLVED":
      case "CLOSED_UNRESOLVED":
      case "CLOSED_ABANDONED":
        return <ClosedCaseSubView status={status} />;
      default:
        return (
          <p className="text-gray-600">Unknown case status: {status}</p>
        );
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Case with {caseData.otherPartyName || "the other party"}
        </h1>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {getPhaseLabel(status)}
        </span>
      </header>
      {renderSubView()}
    </div>
  );
}

export function CaseDetail() {
  return (
    <ConvexErrorBoundary>
      <CaseDetailContent />
    </ConvexErrorBoundary>
  );
}

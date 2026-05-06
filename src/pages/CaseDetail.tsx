import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ConvexErrorBoundary } from "@/components/layout/ConvexErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

function CaseDetailSkeleton() {
  return (
    <div className="space-y-6" data-testid="case-detail-skeleton">
      <Skeleton className="h-8 w-48" />
      <div className="rounded-lg border border-border-default bg-surface p-6 shadow-1 space-y-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="rounded-lg border border-border-default bg-surface p-6 shadow-1 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function CaseDetailContent() {
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const caseId = caseIdParam as Id<"cases">;

  const caseData = useQuery(api.cases.get, { caseId });
  const partyData = useQuery(api.cases.partyStates, { caseId });

  if (caseData === undefined || partyData === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <CaseDetailSkeleton />
      </div>
    );
  }

  if (caseData === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-text-secondary">Case not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-h1 font-bold text-text-primary">Case Detail</h1>

      <div className="rounded-lg border border-border-default bg-surface p-6 shadow-1">
        <dl className="space-y-3">
          <div>
            <dt className="text-meta font-medium text-text-secondary">Status</dt>
            <dd className="text-text-primary" data-testid="case-status">
              {caseData.status}
            </dd>
          </div>
          <div>
            <dt className="text-meta font-medium text-text-secondary">Category</dt>
            <dd className="text-text-primary">{caseData.category}</dd>
          </div>
        </dl>
      </div>

      {/* Own party state — full detail */}
      {partyData.self && (
        <div className="rounded-lg border border-border-default bg-surface p-6 shadow-1">
          <h2 className="text-h2 font-semibold text-text-primary mb-3">
            Your Information
          </h2>
          <dl className="space-y-3">
            {partyData.self.mainTopic && (
              <div>
                <dt className="text-meta font-medium text-text-secondary">
                  Main Topic
                </dt>
                <dd className="text-text-primary" data-testid="self-main-topic">
                  {partyData.self.mainTopic}
                </dd>
              </div>
            )}
            {partyData.self.description && (
              <div>
                <dt className="text-meta font-medium text-text-secondary">
                  Description
                </dt>
                <dd className="text-text-primary" data-testid="self-description">
                  {partyData.self.description}
                </dd>
              </div>
            )}
            {partyData.self.desiredOutcome && (
              <div>
                <dt className="text-meta font-medium text-text-secondary">
                  Desired Outcome
                </dt>
                <dd
                  className="text-text-primary"
                  data-testid="self-desired-outcome"
                >
                  {partyData.self.desiredOutcome}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Other party — phase-level booleans only, no form content */}
      {partyData.otherPhaseOnly && (
        <div className="rounded-lg border border-border-default bg-surface p-6 shadow-1">
          <h2 className="text-h2 font-semibold text-text-primary mb-3">
            Other Party
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-meta font-medium text-text-secondary">Name</dt>
              <dd className="text-text-primary">
                {partyData.otherPhaseOnly.displayName}
              </dd>
            </div>
            <div>
              <dt className="text-meta font-medium text-text-secondary">
                Private Coaching
              </dt>
              <dd
                className="text-text-primary"
                data-testid="other-party-pc-status"
              >
                {partyData.otherPhaseOnly.hasCompletedPC
                  ? "Completed"
                  : "In progress"}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Navigation links */}
      <div className="flex gap-4">
        <Link
          to={`/cases/${caseIdParam}/private`}
          className="text-accent underline hover:text-accent-hover"
        >
          Private Coaching
        </Link>
        <Link
          to={`/cases/${caseIdParam}/joint`}
          className="text-accent underline hover:text-accent-hover"
        >
          Joint Chat
        </Link>
      </div>
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

// Alias used by some consumers
export { CaseDetail as CaseDetailView };

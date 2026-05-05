import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ConvexErrorBoundary } from "@/components/layout/ConvexErrorBoundary";

function CaseDetailContent() {
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const caseId = caseIdParam as Id<"cases">;

  const caseData = useQuery(api.cases.get, { caseId });
  const partyData = useQuery(api.cases.partyStates, { caseId });

  if (caseData === undefined || partyData === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (caseData === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-600">Case not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Case Detail</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="text-gray-900" data-testid="case-status">
              {caseData.status}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Category</dt>
            <dd className="text-gray-900">{caseData.category}</dd>
          </div>
        </dl>
      </div>

      {/* Own party state — full detail */}
      {partyData.self && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Your Information
          </h2>
          <dl className="space-y-3">
            {partyData.self.mainTopic && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Main Topic
                </dt>
                <dd className="text-gray-900" data-testid="self-main-topic">
                  {partyData.self.mainTopic}
                </dd>
              </div>
            )}
            {partyData.self.description && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Description
                </dt>
                <dd className="text-gray-900" data-testid="self-description">
                  {partyData.self.description}
                </dd>
              </div>
            )}
            {partyData.self.desiredOutcome && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Desired Outcome
                </dt>
                <dd
                  className="text-gray-900"
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
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Other Party
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="text-gray-900">
                {partyData.otherPhaseOnly.displayName}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Private Coaching
              </dt>
              <dd
                className="text-gray-900"
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
          className="text-blue-600 underline hover:text-blue-800"
        >
          Private Coaching
        </Link>
        <Link
          to={`/cases/${caseIdParam}/joint`}
          className="text-blue-600 underline hover:text-blue-800"
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

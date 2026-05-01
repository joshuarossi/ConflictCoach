import { Link, useParams, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

/** Maps route segments to human-readable phase labels. */
function getPhaseLabel(segment: string | undefined): string | null {
  switch (segment) {
    case "private":
      return "Private Coaching";
    case "joint":
      return "Joint Chat";
    case "closed":
      return "Closed";
    default:
      return null;
  }
}

export interface TopNavProps {
  /** Optional slot for PartyToggle or other controls */
  children?: ReactNode;
  /** Case name for inside-case mode (e.g. "Case with Jordan") */
  caseName?: string;
}

export function TopNav({ children, caseName }: TopNavProps) {
  const params = useParams<{ caseId: string }>();
  const location = useLocation();

  const isCaseRoute = !!params.caseId;

  // Determine phase from the URL segment after /cases/:caseId/
  const pathSegments = location.pathname.split("/");
  const caseIdIndex = pathSegments.indexOf(params.caseId ?? "");
  const phaseSegment = caseIdIndex >= 0 ? pathSegments[caseIdIndex + 1] : undefined;
  const phaseLabel = getPhaseLabel(phaseSegment);

  if (isCaseRoute) {
    return (
      <nav className="border-b bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-900">
            {caseName ?? `Case ${params.caseId}`}
            {phaseLabel && (
              <>
                <span className="text-gray-400"> · </span>
                <span data-testid="phase-indicator">{phaseLabel}</span>
              </>
            )}
          </span>
          {children && <div className="ml-auto">{children}</div>}
        </div>
      </nav>
    );
  }

  // Dashboard / non-case mode
  return (
    <nav className="border-b bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="text-lg font-bold text-gray-900">
          Conflict Coach
        </Link>
        <div className="flex items-center gap-4">
          {children}
        </div>
      </div>
    </nav>
  );
}

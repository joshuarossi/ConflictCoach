import { useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";

type CaseStatus =
  | "DRAFT_PRIVATE_COACHING"
  | "BOTH_PRIVATE_COACHING"
  | "READY_FOR_JOINT"
  | "JOINT_ACTIVE"
  | "CLOSED_RESOLVED"
  | "CLOSED_UNRESOLVED"
  | "CLOSED_ABANDONED";

function isClosed(status: string): boolean {
  return status.startsWith("CLOSED_");
}

/**
 * Map case status to glyph, color class, and label per AC:
 *   ● green  = your turn
 *   ○ gray   = waiting
 *   ◐ amber  = ready for joint
 *   ◼ neutral = closed
 */
function statusIndicator(
  status: CaseStatus,
  hasCompletedPC: boolean,
): {
  glyph: string;
  colorClass: string;
  label: string;
} {
  switch (status) {
    case "DRAFT_PRIVATE_COACHING":
      return { glyph: "●", colorClass: "text-success", label: "Your turn" };
    case "BOTH_PRIVATE_COACHING":
      // hasCompletedPC = other party has completed private coaching.
      // If they are done, it is now your turn to finish.
      if (hasCompletedPC) {
        return { glyph: "●", colorClass: "text-success", label: "Your turn" };
      }
      // Other party still working — you are waiting on them.
      return { glyph: "○", colorClass: "text-text-tertiary", label: "Waiting" };
    case "JOINT_ACTIVE":
      return { glyph: "●", colorClass: "text-success", label: "Your turn" };
    case "READY_FOR_JOINT":
      return { glyph: "◐", colorClass: "text-warning", label: "Ready for joint session" };
    case "CLOSED_RESOLVED":
    case "CLOSED_UNRESOLVED":
    case "CLOSED_ABANDONED":
      return { glyph: "◼", colorClass: "text-text-secondary", label: "Closed" };
    default:
      return { glyph: "○", colorClass: "text-text-tertiary", label: "Waiting" };
  }
}

function statusText(status: CaseStatus): string {
  switch (status) {
    case "DRAFT_PRIVATE_COACHING":
      return "Private Coaching";
    case "BOTH_PRIVATE_COACHING":
      return "Both in Private Coaching";
    case "READY_FOR_JOINT":
      return "Ready for Joint Session";
    case "JOINT_ACTIVE":
      return "In Session";
    case "CLOSED_RESOLVED":
      return "Resolved";
    case "CLOSED_UNRESOLVED":
      return "Unresolved";
    case "CLOSED_ABANDONED":
      return "Abandoned";
    default:
      return status;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(timestamp);
}

interface CaseRow {
  id: string;
  status: CaseStatus;
  category: string;
  createdAt: number;
  updatedAt: number;
  isSolo: boolean;
  displayName: string;
  hasCompletedPC: boolean;
}

function CaseRowItem({ caseItem }: { caseItem: CaseRow }) {
  const indicator = statusIndicator(caseItem.status, caseItem.hasCompletedPC);
  const otherPartyName =
    caseItem.displayName || (caseItem.isSolo ? "Solo case" : "Pending invite");

  return (
    <Link
      to={`/cases/${caseItem.id}`}
      className="flex items-center justify-between rounded-md border border-border-default bg-surface px-4 py-3 shadow-1 hover:shadow-2 transition-shadow"
      data-testid="case-row"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className={`${indicator.colorClass} text-lg shrink-0`}
          aria-label={indicator.label}
          data-testid="status-indicator"
        >
          {indicator.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary truncate">
              {otherPartyName}
            </span>
            <span className="text-meta text-text-tertiary capitalize">
              {caseItem.category}
            </span>
          </div>
          <div className="flex items-center gap-2 text-label text-text-secondary mt-0.5 flex-wrap">
            <span>{statusText(caseItem.status)}</span>
            <span>·</span>
            <span>Created {formatDate(caseItem.createdAt)}</span>
            <span>·</span>
            <span>Updated {formatRelativeTime(caseItem.updatedAt)}</span>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <span>Enter</span>
      </Button>
    </Link>
  );
}

export function Dashboard() {
  const cases = useQuery(api.cases.list);
  const [closedExpanded, setClosedExpanded] = useState(false);

  if (cases === undefined) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h1 font-bold text-text-primary">Dashboard</h1>
        </div>
        <p className="text-text-secondary">Loading…</p>
      </div>
    );
  }

  const activeCases = cases.filter((c: CaseRow) => !isClosed(c.status));
  const closedCases = cases.filter((c: CaseRow) => isClosed(c.status));

  if (cases.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h1 font-bold text-text-primary">Dashboard</h1>
          <Link to="/cases/new">
            <Button>+ New Case</Button>
          </Link>
        </div>
        <p className="text-text-secondary">
          No cases yet. When you're ready to work through something, start a new
          case.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-h1 font-bold text-text-primary">Dashboard</h1>
        <Link to="/cases/new">
          <Button>+ New Case</Button>
        </Link>
      </div>

      {activeCases.length > 0 && (
        <section className="mb-8">
          <h2 className="text-h2 font-semibold text-text-primary mb-3">
            Active
          </h2>
          <div className="flex flex-col gap-2">
            {activeCases.map((c: CaseRow) => (
              <CaseRowItem key={c.id} caseItem={c} />
            ))}
          </div>
        </section>
      )}

      {closedCases.length > 0 && (
        <section>
          <button
            onClick={() => setClosedExpanded(!closedExpanded)}
            className="flex items-center gap-2 text-h2 font-semibold text-text-primary mb-3 hover:text-accent transition-colors"
            aria-expanded={closedExpanded}
          >
            <span className="text-label">{closedExpanded ? "▼" : "▶"}</span>
            Closed ({closedCases.length})
          </button>
          <div hidden={!closedExpanded} className="flex flex-col gap-2">
            {closedCases.map((c: CaseRow) => (
              <CaseRowItem key={c.id} caseItem={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

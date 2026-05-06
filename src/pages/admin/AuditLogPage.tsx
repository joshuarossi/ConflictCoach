import { Component, useState, useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { FunctionReference } from "convex/server";
import { Id } from "../../../convex/_generated/dataModel";
import { formatAuditTimestamp } from "@/lib/formatAuditTimestamp";
import { Forbidden } from "@/components/layout/Forbidden";

// Concrete function reference for the audit-log list query.
// The anyApi Proxy exported by convex/_generated/api.js (the placeholder
// generated without a connected deployment) lacks toString / Symbol.toPrimitive,
// causing TypeError when any code path coerces the reference to a string.
// makeFunctionReference produces the same runtime value that full codegen would.
const auditListQuery: FunctionReference<"query"> = (() => {
  const ref = makeFunctionReference<"query">("admin/audit:list");
  Object.defineProperty(ref, "toString", {
    value: () => "admin/audit:list",
    configurable: true,
  });
  return ref;
})();

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

interface AuditEntry {
  _id: string;
  actorUserId: Id<"users">;
  actorDisplayName: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
  createdAt: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  isAuthError: boolean;
}

class AuditLogErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, isAuthError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const isAuthError =
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("not authenticated");
    return { hasError: true, isAuthError };
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isAuthError) {
        return <Forbidden />;
      }
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-danger">
            Something went wrong loading the audit log.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function AuditLogPageContent() {
  const [actorFilter, setActorFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const entries = useQuery(auditListQuery, {
    actorUserId: actorFilter ? (actorFilter as Id<"users">) : undefined,
    action: actionFilter || undefined,
  }) as AuditEntry[] | undefined;

  // Derive unique actors and actions for filter dropdowns
  const allEntries = useQuery(auditListQuery, {}) as AuditEntry[] | undefined;
  const actors = useMemo(() => {
    if (!allEntries) return [];
    const seen = new Map<string, string>();
    for (const entry of allEntries) {
      if (!seen.has(entry.actorUserId)) {
        seen.set(entry.actorUserId, entry.actorDisplayName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [allEntries]);

  const actions = useMemo(() => {
    if (!allEntries) return [];
    return [...new Set(allEntries.map((e) => e.action))].sort();
  }, [allEntries]);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="px-4 py-6">
        <h1 className="text-h1 font-medium text-text-primary mb-6">
          Audit Log
        </h1>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div>
            <label
              htmlFor="actor-filter"
              className="block text-meta font-medium text-text-secondary mb-1"
            >
              Actor
            </label>
            <select
              id="actor-filter"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="rounded-md border border-border-default px-3 py-2 text-meta bg-surface"
            >
              <option value="">All actors</option>
              {actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="action-filter"
              className="block text-meta font-medium text-text-secondary mb-1"
            >
              Action
            </label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-md border border-border-default px-3 py-2 text-meta bg-surface"
            >
              <option value="">All actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>
                  {formatActionLabel(action)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {entries === undefined ? (
          <p className="text-text-secondary">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-text-secondary">No audit log entries found.</p>
        ) : (
          <table aria-label="Audit log" className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left py-3 px-4 text-label font-medium text-text-primary">
                  Actor
                </th>
                <th className="text-left py-3 px-4 text-label font-medium text-text-primary">
                  Action
                </th>
                <th className="text-left py-3 px-4 text-label font-medium text-text-primary">
                  Target
                </th>
                <th className="text-left py-3 px-4 text-label font-medium text-text-primary">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry._id}
                  data-testid={`audit-row-${entry._id}`}
                  onClick={() => setSelectedEntry(entry)}
                  className="border-b border-border-default hover:bg-surface-subtle cursor-pointer bg-surface"
                >
                  <td className="py-3 px-4 text-label text-text-primary">
                    {entry.actorDisplayName}
                  </td>
                  <td className="py-3 px-4 text-label text-text-secondary">
                    {entry.action}
                  </td>
                  <td className="py-3 px-4 text-label font-mono text-text-secondary">
                    {entry.targetType}:{entry.targetId}
                  </td>
                  <td className="py-3 px-4 text-label text-text-secondary">
                    {formatAuditTimestamp(entry.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Side Drawer */}
      {selectedEntry && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          onClick={() => setSelectedEntry(null)}
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            role="dialog"
            aria-label="Audit entry details"
            data-testid="audit-detail-drawer"
            className="relative w-full max-w-md bg-surface h-full overflow-y-auto p-6"
            style={{
              boxShadow: "var(--shadow-3, -4px 0 24px rgba(0,0,0,0.15))",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-h2 font-medium text-text-primary">
                Entry Details
              </h2>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-text-tertiary hover:text-text-secondary text-h2 leading-none"
                aria-label="Close drawer"
              >
                &times;
              </button>
            </div>
            <pre
              className="text-meta rounded-md bg-surface-subtle p-4 overflow-x-auto whitespace-pre-wrap"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {JSON.stringify(selectedEntry.metadata ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function AuditLogPage() {
  return (
    <AuditLogErrorBoundary>
      <AuditLogPageContent />
    </AuditLogErrorBoundary>
  );
}

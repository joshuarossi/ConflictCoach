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
    const message =
      error instanceof Error ? error.message.toLowerCase() : "";
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
          <p className="text-red-600">Something went wrong loading the audit log.</p>
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
    const counts = new Map<string, { name: string; count: number }>();
    for (const entry of allEntries) {
      const existing = counts.get(entry.actorUserId);
      if (existing) {
        existing.count++;
      } else {
        counts.set(entry.actorUserId, { name: entry.actorDisplayName, count: 1 });
      }
    }
    return Array.from(counts.entries()).map(([id, { name, count }]) => ({ id, name, count }));
  }, [allEntries]);

  const actions = useMemo(() => {
    if (!allEntries) return [];
    return [...new Set(allEntries.map((e) => e.action))].sort();
  }, [allEntries]);

  return (
    <div style={{ background: "var(--bg-canvas, #f9fafb)" }} className="min-h-screen">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Log</h1>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div>
            <label htmlFor="actor-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Actor
            </label>
            <select
              id="actor-filter"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">All actors</option>
              {actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name} ({actor.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="action-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
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
          <p className="text-gray-500">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-500">No audit log entries found.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: "var(--text-primary, #111827)" }}>Actor</th>
                <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: "var(--text-primary, #111827)" }}>Action</th>
                <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: "var(--text-primary, #111827)" }}>Target</th>
                <th className="text-left py-3 px-4 text-sm font-semibold" style={{ color: "var(--text-primary, #111827)" }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry._id}
                  data-testid={`audit-row-${entry._id}`}
                  onClick={() => setSelectedEntry(entry)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  style={{ background: "var(--bg-surface, #ffffff)" }}
                >
                  <td data-testid={`audit-row-${entry._id}-actor`} className="py-3 px-4 text-sm" style={{ color: "var(--text-primary, #111827)" }}>
                    {entry.actorDisplayName}
                  </td>
                  <td data-testid={`audit-row-${entry._id}-action`} className="py-3 px-4 text-sm" style={{ color: "var(--text-secondary, #6b7280)" }}>
                    {entry.action}
                  </td>
                  <td data-testid={`audit-row-${entry._id}-target`} className="py-3 px-4 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary, #6b7280)" }}>
                    {entry.targetType}:{entry.targetId}
                  </td>
                  <td data-testid={`audit-row-${entry._id}-timestamp`} className="py-3 px-4 text-sm" style={{ color: "var(--text-secondary, #6b7280)" }}>
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
          <div className="fixed inset-0 bg-black/30" />
          <div
            className="relative w-full max-w-md bg-white h-full overflow-y-auto p-6"
            style={{ boxShadow: "var(--shadow-3, -4px 0 24px rgba(0,0,0,0.15))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Entry Details</h2>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                aria-label="Close drawer"
              >
                &times;
              </button>
            </div>
            <pre
              className="text-sm rounded-md bg-gray-50 p-4 overflow-x-auto whitespace-pre-wrap"
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

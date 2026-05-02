import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

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

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + " at " + date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function AuditLogPage() {
  const [actorFilter, setActorFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const entries = useQuery(api.admin.audit.list, {
    actorUserId: actorFilter ? (actorFilter as Id<"users">) : undefined,
    action: actionFilter || undefined,
  }) as AuditEntry[] | undefined;

  // Derive unique actors and actions for filter dropdowns
  const allEntries = useQuery(api.admin.audit.list, {}) as AuditEntry[] | undefined;
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
                  {actor.name}
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
                  {action}
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
                  onClick={() => setSelectedEntry(entry)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  style={{ background: "var(--bg-surface, #ffffff)" }}
                >
                  <td className="py-3 px-4 text-sm" style={{ color: "var(--text-primary, #111827)" }}>
                    {entry.actorDisplayName}
                  </td>
                  <td className="py-3 px-4 text-sm" style={{ color: "var(--text-secondary, #6b7280)" }}>
                    {entry.action}
                  </td>
                  <td className="py-3 px-4 text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary, #6b7280)" }}>
                    {entry.targetType}:{entry.targetId}
                  </td>
                  <td className="py-3 px-4 text-sm" style={{ color: "var(--text-secondary, #6b7280)" }}>
                    {formatTimestamp(entry.createdAt)}
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

/**
 * Formats a numeric timestamp (epoch ms) into a human-readable string.
 *
 * Example output: "Apr 29, 2026 at 3:42 PM"
 */
export function formatAuditTimestamp(ts: number): string {
  const date = new Date(ts);
  return (
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
}

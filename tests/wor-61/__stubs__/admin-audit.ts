/**
 * Stub for convex/admin/audit — replaced by real implementation in task-implement.
 * Tests import from here via relative path; once implementation exists,
 * the import path is updated to ../../convex/admin/audit.
 */

export interface AuditLogEntry {
  _id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
  createdAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function listAuditLogs(ctx: unknown, args: {
  actorUserId?: string;
  action?: string;
}): Promise<AuditLogEntry[]> {
  throw new Error(
    "listAuditLogs is not yet implemented (WOR-61 red-state stub)",
  );
}

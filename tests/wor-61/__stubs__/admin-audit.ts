/**
 * Test shim for convex/admin/audit — re-exports the real handler under the
 * shape the tests originally expected (`listAuditLogs`).  Kept as a shim
 * (rather than updating each test import) so that future regenerations of
 * the test scaffolding still work without touching every spec.
 */
import { listAuditLogsHandler } from "../../../convex/admin/audit";

export interface AuditLogEntry {
  _id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
  createdAt: number;
}

export const listAuditLogs = listAuditLogsHandler as (
  ctx: unknown,
  args: { actorUserId?: string; action?: string },
) => Promise<AuditLogEntry[]>;

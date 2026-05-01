/**
 * Stub for convex/lib/audit — replaced by real implementation in task-implement.
 * Tests import from here via relative path; once implementation exists,
 * the import path is updated to ../../convex/lib/audit.
 */

export const AUDIT_ACTIONS = {
  TEMPLATE_CREATED: "TEMPLATE_CREATED",
  TEMPLATE_PUBLISHED: "TEMPLATE_PUBLISHED",
  TEMPLATE_ARCHIVED: "TEMPLATE_ARCHIVED",
} as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function writeAuditLog(ctx: unknown, params: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
}): Promise<void> {
  throw new Error(
    "writeAuditLog is not yet implemented (WOR-61 red-state stub)",
  );
}

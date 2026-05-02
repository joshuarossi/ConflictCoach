import { MutationAuthContext } from "./auth";

// Audit action constants for type safety and reuse
export const AUDIT_ACTIONS = {
  TEMPLATE_CREATED: "TEMPLATE_CREATED",
  TEMPLATE_PUBLISHED: "TEMPLATE_PUBLISHED",
  TEMPLATE_ARCHIVED: "TEMPLATE_ARCHIVED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Writes an audit log entry within the caller's transaction.
 *
 * Must be called from a mutation context so it participates in
 * the same transaction as the admin action being audited.
 */
export async function writeAuditLog(
  ctx: MutationAuthContext,
  params: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    metadata?: unknown;
  },
): Promise<void> {
  await ctx.db.insert("auditLog", {
    actorUserId: params.actorUserId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata,
    createdAt: Date.now(),
  });
}

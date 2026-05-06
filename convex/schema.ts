import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  // --- Users (managed partly by Convex Auth) ---
  users: defineTable({
    email: v.string(),
    displayName: v.optional(v.string()),
    role: v.union(v.literal("USER"), v.literal("ADMIN")),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // --- Cases ---
  // Invariant: cases.schemaVersion is present on every case for forward
  // migration support. v1 is always 1.
  cases: defineTable({
    schemaVersion: v.literal(1),
    status: v.union(
      v.literal("DRAFT_PRIVATE_COACHING"), // initiator has created, invitee may or may not have joined
      v.literal("BOTH_PRIVATE_COACHING"), // both parties in private coaching
      v.literal("READY_FOR_JOINT"), // both marked PC complete; synthesis generated
      v.literal("JOINT_ACTIVE"), // in joint chat
      v.literal("CLOSED_RESOLVED"),
      v.literal("CLOSED_UNRESOLVED"),
      v.literal("CLOSED_ABANDONED"), // auto-closed after 30d inactivity
    ),
    isSolo: v.boolean(), // solo test mode
    category: v.string(), // "workplace" | "family" | "personal" | "contractual" | "other"
    // Invariant: templateVersionId is set at case creation and NEVER changes,
    // even if the template is edited or archived later.
    templateVersionId: v.id("templateVersions"),
    initiatorUserId: v.id("users"),
    inviteeUserId: v.optional(v.id("users")), // null until invite redeemed
    createdAt: v.number(),
    updatedAt: v.number(),
    closedAt: v.optional(v.number()),
    closureSummary: v.optional(v.string()), // populated on resolution
    // Per-case AI cost accumulator (WOR-66)
    aiUsage: v.optional(
      v.object({
        totalInputTokens: v.number(),
        totalOutputTokens: v.number(),
        totalCostUsd: v.number(),
        softCapReachedAt: v.optional(v.number()),
      }),
    ),
  })
    .index("by_initiator", ["initiatorUserId"])
    .index("by_invitee", ["inviteeUserId"]),

  // --- Per-party state within a case ---
  partyStates: defineTable({
    caseId: v.id("cases"),
    userId: v.id("users"),
    role: v.union(v.literal("INITIATOR"), v.literal("INVITEE")),
    // Form fields
    mainTopic: v.optional(v.string()),
    description: v.optional(v.string()),
    desiredOutcome: v.optional(v.string()),
    // Phase state
    formCompletedAt: v.optional(v.number()),
    privateCoachingCompletedAt: v.optional(v.number()),
    synthesisText: v.optional(v.string()), // generated post-private-coaching
    synthesisGeneratedAt: v.optional(v.number()),
    closureProposed: v.optional(v.boolean()),
    closureConfirmed: v.optional(v.boolean()),
  })
    .index("by_case", ["caseId"])
    .index("by_case_and_user", ["caseId", "userId"]),

  // --- Private coaching messages (per party, isolated) ---
  // Invariant: privateMessages for user A in case C are NEVER returned by any
  // query where the caller is not user A (privateMessages isolation). The
  // by_case_and_user index enforces per-party isolation in queries. The by_case
  // index is used by server-side AI context assembly only and is never exposed
  // to clients.
  privateMessages: defineTable({
    caseId: v.id("cases"),
    userId: v.id("users"), // owner — only this user can read
    role: v.union(v.literal("USER"), v.literal("AI")),
    content: v.string(),
    status: v.union(v.literal("STREAMING"), v.literal("COMPLETE"), v.literal("ERROR")),
    tokens: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_case_and_user", ["caseId", "userId"])
    .index("by_case", ["caseId"]), // server-side AI context assembly only; never exposed

  // --- Joint chat messages ---
  jointMessages: defineTable({
    caseId: v.id("cases"),
    authorType: v.union(v.literal("USER"), v.literal("COACH")),
    authorUserId: v.optional(v.id("users")), // null if authorType=COACH
    content: v.string(),
    status: v.union(v.literal("STREAMING"), v.literal("COMPLETE"), v.literal("ERROR")),
    // Metadata
    tokens: v.optional(v.number()),
    isIntervention: v.optional(v.boolean()), // coach intervention on inflammatory content
    replyToId: v.optional(v.id("jointMessages")),
    createdAt: v.number(),
  }).index("by_case", ["caseId"]),

  // --- Draft Coach sessions (private to drafter) ---
  draftSessions: defineTable({
    caseId: v.id("cases"),
    userId: v.id("users"),
    status: v.union(v.literal("ACTIVE"), v.literal("SENT"), v.literal("DISCARDED")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    finalDraft: v.optional(v.string()), // the send-ready text when user confirms
  }).index("by_case_and_user", ["caseId", "userId"]),

  draftMessages: defineTable({
    draftSessionId: v.id("draftSessions"),
    role: v.union(v.literal("USER"), v.literal("AI")),
    content: v.string(),
    status: v.union(v.literal("STREAMING"), v.literal("COMPLETE"), v.literal("ERROR")),
    tokens: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_draft_session", ["draftSessionId"]),

  // --- Invite tokens ---
  inviteTokens: defineTable({
    caseId: v.id("cases"),
    token: v.string(), // 32 chars, url-safe, generated crypto-random
    status: v.union(v.literal("ACTIVE"), v.literal("CONSUMED"), v.literal("REVOKED")),
    createdAt: v.number(),
    consumedAt: v.optional(v.number()),
    consumedByUserId: v.optional(v.id("users")),
  })
    .index("by_token", ["token"])
    .index("by_case", ["caseId"]),

  // --- Templates ---
  templates: defineTable({
    category: v.string(),
    name: v.string(),
    currentVersionId: v.optional(v.id("templateVersions")),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    createdByUserId: v.id("users"),
  }).index("by_category", ["category"]),

  // Invariant: templateVersions rows are immutable once created. Publishing a
  // new version means inserting a new row and updating templates.currentVersionId.
  templateVersions: defineTable({
    templateId: v.id("templates"),
    version: v.number(), // monotonic within template
    // Immutable content once published
    globalGuidance: v.string(),
    coachInstructions: v.optional(v.string()),
    draftCoachInstructions: v.optional(v.string()),
    publishedAt: v.number(),
    publishedByUserId: v.id("users"),
    publishedByName: v.optional(v.string()), // denormalized display name at publish time
    notes: v.optional(v.string()),
  }).index("by_template", ["templateId"]),

  // --- Audit log ---
  auditLog: defineTable({
    actorUserId: v.id("users"),
    action: v.string(), // e.g. "TEMPLATE_PUBLISHED", "CASE_CLOSED"
    targetType: v.string(), // e.g. "templateVersion", "case"
    targetId: v.string(), // id as string
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_actor", ["actorUserId"]),
});

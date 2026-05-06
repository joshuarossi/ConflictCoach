import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ChatWindow, type ChatMessage } from "@/components/ChatWindow";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function outcomeLabel(status: string): string {
  switch (status) {
    case "CLOSED_RESOLVED":
      return "Resolved";
    case "CLOSED_UNRESOLVED":
      return "Not Resolved";
    case "CLOSED_ABANDONED":
      return "Abandoned";
    default:
      return status;
  }
}

function outcomeBadgeClasses(status: string): string {
  switch (status) {
    case "CLOSED_RESOLVED":
      return "bg-[var(--success)]/15 text-[var(--success)]";
    case "CLOSED_UNRESOLVED":
      return "bg-[var(--warning)]/15 text-[var(--warning)]";
    case "CLOSED_ABANDONED":
      return "bg-[var(--bg-surface-subtle)] text-[var(--text-tertiary)]";
    default:
      return "";
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Props-based presentational component
// ---------------------------------------------------------------------------

export interface ClosedCaseViewProps {
  caseName?: string;
  category?: string;
  closedAt?: number;
  status?: string;
  closureSummary?: string | null;
  jointMessages?: Array<{
    _id: string;
    authorType: "USER" | "COACH";
    authorUserId?: string;
    content: string;
    status: "STREAMING" | "COMPLETE" | "ERROR";
    isIntervention?: boolean;
    createdAt: number;
  }>;
  privateMessages?: Array<{
    _id: string;
    role: "USER" | "AI";
    content: string;
    status: "STREAMING" | "COMPLETE" | "ERROR";
    createdAt: number;
  }>;
  synthesisText?: string | null;
  initiatorUserId?: string;
  currentUserId?: string;
  defaultTab?: string;
  onTabChange?: (tab: string) => void;
}

export function ClosedCaseView({
  caseName = "",
  category = "",
  closedAt = Date.now(),
  status = "",
  closureSummary,
  jointMessages = [],
  privateMessages = [],
  synthesisText = null,
  initiatorUserId,
  defaultTab = "joint",
  onTabChange,
}: ClosedCaseViewProps) {
  // Map joint messages to ChatMessage format
  const jointChatMessages: ChatMessage[] = jointMessages.map((m) => {
    const isCoach = m.authorType === "COACH";
    const isInitiator =
      !isCoach && m.authorUserId != null && m.authorUserId === initiatorUserId;
    const partyRole: "INITIATOR" | "INVITEE" | undefined = isCoach
      ? undefined
      : isInitiator
        ? "INITIATOR"
        : "INVITEE";

    return {
      _id: m._id,
      role: (isCoach ? "AI" : "USER") as "USER" | "AI",
      authorType: m.authorType,
      content: m.content,
      status: m.status,
      createdAt: m.createdAt,
      variant: "joint" as const,
      partyRole,
      isIntervention: m.isIntervention,
    };
  });

  // Map private messages to ChatMessage format
  const privateChatMessages: ChatMessage[] = privateMessages.map((m) => ({
    _id: m._id,
    role: m.role,
    content: m.content,
    status: m.status,
    createdAt: m.createdAt,
  }));

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6">
      {/* AC7: Closed banner */}
      <div
        className="mb-6 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] px-4 py-3 text-center text-sm text-[var(--text-secondary)]"
        role="status"
      >
        This case is closed. No new messages can be added.
      </div>

      {/* AC1: Header with case name, category, closure date, outcome */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {caseName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span>{category}</span>
          <span aria-hidden="true">&middot;</span>
          <span>Closed {formatDate(closedAt)}</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${outcomeBadgeClasses(status)}`}
            data-testid="outcome-badge"
          >
            {outcomeLabel(status)}
          </span>
        </div>
      </header>

      {/* AC2: Closure summary for resolved cases */}
      {status === "CLOSED_RESOLVED" && closureSummary && (
        <div
          className="mb-6 rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/5 p-4"
          data-testid="closure-summary"
        >
          <h2 className="mb-2 text-sm font-semibold text-[var(--success)]">
            Resolution Summary
          </h2>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
            {closureSummary}
          </p>
        </div>
      )}

      {/* AC4: Tab navigation */}
      <Tabs
        defaultValue={defaultTab}
        onValueChange={onTabChange}
      >
        <TabsList className="w-full">
          <TabsTrigger value="joint" className="flex-1">
            Joint Chat
          </TabsTrigger>
          <TabsTrigger value="private" className="flex-1">
            My Private Coaching
          </TabsTrigger>
          <TabsTrigger value="guidance" className="flex-1">
            My Guidance
          </TabsTrigger>
        </TabsList>

        {/* AC3: Read-only joint chat transcript */}
        <TabsContent value="joint">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
            <div className="max-h-[60vh] overflow-y-auto">
              <ChatWindow messages={jointChatMessages} />
            </div>
          </div>
        </TabsContent>

        {/* AC5: My Private Coaching tab */}
        <TabsContent value="private">
          <div
            className="rounded-lg border border-[var(--border-default)]"
            style={{ backgroundColor: "var(--private-tint)" }}
          >
            <div className="max-h-[60vh] overflow-y-auto">
              <ChatWindow messages={privateChatMessages} />
            </div>
          </div>
        </TabsContent>

        {/* AC6: My Guidance (synthesis) tab */}
        <TabsContent value="guidance">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            {synthesisText ? (
              <div className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">
                {synthesisText}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-tertiary)]">
                No guidance available.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connected wrapper — uses Convex hooks, renders at /cases/:caseId/closed
// ---------------------------------------------------------------------------

export function ClosedCasePage() {
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const caseId = caseIdParam as Id<"cases">;

  // Persist selected tab in URL query param
  const currentTab = searchParams.get("tab") ?? "joint";

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  // Data queries
  const caseData = useQuery(api.cases.get, { caseId });
  const partyData = useQuery(api.cases.partyStates, { caseId });
  const jointMessages = useQuery(api.jointChat.messages, { caseId });
  const privateMessages = useQuery(api.privateCoaching.myMessages, { caseId });
  const synthesisData = useQuery(api.jointChat.mySynthesis, { caseId });

  // Loading state
  if (
    caseData === undefined ||
    partyData === undefined ||
    jointMessages === undefined
  ) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Not found
  if (caseData === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-[var(--text-secondary)]">Case not found.</p>
      </div>
    );
  }

  // Derive case name from initiator's partyState mainTopic
  const caseName =
    partyData.self?.mainTopic ?? caseData.otherPartyName ?? "Untitled Case";

  const normalizedJointMessages = (
    jointMessages as Array<{
      _id: unknown;
      authorType: unknown;
      authorUserId?: unknown;
      content: unknown;
      status: unknown;
      isIntervention?: unknown;
      createdAt: unknown;
    }>
  ).map((m) => ({
    _id: m._id as string,
    authorType: m.authorType as "USER" | "COACH",
    authorUserId: m.authorUserId as string | undefined,
    content: m.content as string,
    status: m.status as "STREAMING" | "COMPLETE" | "ERROR",
    isIntervention: m.isIntervention as boolean | undefined,
    createdAt: m.createdAt as number,
  }));

  const normalizedPrivateMessages = (
    (privateMessages ?? []) as Array<{
      _id: unknown;
      role: unknown;
      content: unknown;
      status: unknown;
      createdAt: unknown;
    }>
  ).map((m) => ({
    _id: m._id as string,
    role: m.role as "USER" | "AI",
    content: m.content as string,
    status: m.status as "STREAMING" | "COMPLETE" | "ERROR",
    createdAt: m.createdAt as number,
  }));

  return (
    <ClosedCaseView
      caseName={caseName}
      category={caseData.category as string}
      closedAt={(caseData.closedAt as number) ?? (caseData.updatedAt as number)}
      status={caseData.status as string}
      closureSummary={
        (caseData as Record<string, unknown>).closureSummary as
          | string
          | null
          | undefined
      }
      jointMessages={normalizedJointMessages}
      privateMessages={normalizedPrivateMessages}
      synthesisText={synthesisData?.synthesisText ?? null}
      initiatorUserId={caseData.initiatorUserId as string}
      currentUserId={partyData.self?._id as string}
      defaultTab={currentTab}
      onTabChange={handleTabChange}
    />
  );
}

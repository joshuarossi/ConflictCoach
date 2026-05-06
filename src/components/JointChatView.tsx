import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ChatWindow, type ChatMessage } from "./ChatWindow";
import { Skeleton } from "@/components/ui/skeleton";
import { useNetworkErrorToast } from "@/hooks/useNetworkErrorToast";
import { Sparkles, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ---------------------------------------------------------------------------
// Props-based presentational component (used directly by unit tests)
// ---------------------------------------------------------------------------

export interface JointChatMessage {
  _id: string;
  authorType: "USER" | "COACH";
  authorUserId?: string;
  content: string;
  status: "STREAMING" | "COMPLETE" | "ERROR";
  isIntervention?: boolean;
  createdAt: number;
}

export interface JointChatViewProps {
  caseId?: string;
  otherPartyName?: string;
  /** Display name for initiator party */
  initiatorName?: string;
  /** Display name for invitee party */
  inviteeName?: string;
  /** Display name for the case (shown in header) */
  caseName?: string;
  messages: JointChatMessage[];
  initiatorUserId?: string;
  inviteeUserId?: string;
  currentUserId?: string;
  isStreaming?: boolean;
  synthesisText?: string | null;
  onSendMessage?: (content: string) => void;
  /** Opens the Draft Coach panel */
  onOpenDraftCoach?: () => void;
  /** Opens the closure modal/flow */
  onOpenClosure?: () => void;
  onBack?: () => void;
}

export function JointChatView({
  otherPartyName = "the other party",
  initiatorName,
  inviteeName,
  caseName,
  messages,
  initiatorUserId,
  isStreaming = false,
  synthesisText,
  onSendMessage,
  onOpenDraftCoach,
  onOpenClosure,
  onBack,
}: JointChatViewProps) {
  const [guidanceOpen, setGuidanceOpen] = useState(false);
  const [closureOpen, setClosureOpen] = useState(false);
  const focusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    focusRef.current?.focus();
  }, []);

  const chatMessages: ChatMessage[] = useMemo(
    () =>
      messages.map((m) => {
        const mIsCoach = m.authorType === "COACH";
        const isInitiator =
          !mIsCoach && m.authorUserId != null && m.authorUserId === initiatorUserId;
        const isInvitee =
          !mIsCoach && m.authorUserId != null && m.authorUserId !== initiatorUserId;
        const partyRole: "INITIATOR" | "INVITEE" | undefined = mIsCoach
          ? undefined
          : isInitiator
            ? "INITIATOR"
            : isInvitee
              ? "INVITEE"
              : undefined;

        const authorName = mIsCoach
          ? "Coach"
          : isInitiator
            ? (initiatorName ?? undefined)
            : (inviteeName ?? undefined);

        return {
          _id: m._id,
          role: (mIsCoach ? "AI" : "USER") as "USER" | "AI",
          authorType: m.authorType,
          authorName,
          content: m.content,
          status: m.status,
          createdAt: m.createdAt,
          variant: "joint" as const,
          partyRole,
          isIntervention: m.isIntervention,
        };
      }),
    [messages, initiatorUserId, initiatorName, inviteeName],
  );

  const handleClosureConfirm = useCallback(() => {
    setClosureOpen(false);
    onOpenClosure?.();
  }, [onOpenClosure]);

  return (
    <div
      ref={focusRef}
      tabIndex={-1}
      className="flex h-screen flex-col outline-none"
    >
      {/* Header bar */}
      <header className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-body font-medium text-text-primary">
            {caseName ? `${caseName} \u2022 Joint Session` : `Case with ${otherPartyName} \u2022 Joint Session`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGuidanceOpen(true)}
            className="text-label text-accent hover:text-accent-hover"
          >
            My guidance
          </button>
          <button
            type="button"
            onClick={() => setClosureOpen(true)}
            className="text-label text-text-secondary hover:text-text-primary"
          >
            Close
          </button>
        </div>
      </header>

      {/* Chat area */}
      <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col overflow-hidden">
        <ChatWindow messages={chatMessages} isStreaming={isStreaming} />

        {/* Input area with Send + Draft with Coach */}
        <div className="flex items-end gap-2 border-t border-border-default px-4 py-3">
          <textarea
            className="flex-1 resize-none rounded-md border border-border-default bg-surface px-3 py-2 text-chat text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="Type a message…"
            rows={1}
            aria-label="Message input"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const val = (e.target as HTMLTextAreaElement).value.trim();
                if (val) {
                  onSendMessage?.(val);
                  (e.target as HTMLTextAreaElement).value = "";
                }
              }
            }}
            id="joint-chat-input"
          />
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("joint-chat-input") as HTMLTextAreaElement | null;
              const val = el?.value.trim();
              if (val) {
                onSendMessage?.(val);
                if (el) el.value = "";
              }
            }}
            disabled={isStreaming}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-accent px-4 text-accent-on hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            Send
          </button>
          <button
            type="button"
            onClick={onOpenDraftCoach}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-border-default bg-surface px-3 text-label text-text-secondary hover:bg-surface-subtle"
            aria-label="Draft with Coach"
          >
            <Sparkles size={14} className="text-coach-accent" />
            <span className="hidden sm:inline">Draft with Coach</span>
            <span className="sm:hidden">Draft</span>
          </button>
        </div>
      </div>

      {/* Guidance modal */}
      <Dialog open={guidanceOpen} onOpenChange={setGuidanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>My Guidance</DialogTitle>
            <DialogDescription>
              Your personal synthesis from private coaching.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-body text-text-primary">
            {synthesisText ?? "No synthesis available yet."}
          </div>
        </DialogContent>
      </Dialog>

      {/* Closure modal */}
      <AlertDialog open={closureOpen} onOpenChange={setClosureOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this case?</AlertDialogTitle>
            <AlertDialogDescription>
              Proposing closure will notify the other party. They can accept or
              decline. You can also choose to close unilaterally.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClosureConfirm}>
              Propose closure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connected wrapper — uses Convex hooks, renders at /cases/:id/joint
// ---------------------------------------------------------------------------

export function ConnectedJointChatView() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const typedCaseId = caseId as Id<"cases">;

  // Data queries
  const caseData = useQuery(api.cases.get, { caseId: typedCaseId });
  const partyData = useQuery(api.cases.partyStates, { caseId: typedCaseId });
  const messagesData = useQuery(api.jointChat.messages, { caseId: typedCaseId });
  const synthesisData = useQuery(api.jointChat.mySynthesis, {
    caseId: typedCaseId,
  });

  // Mutations
  const sendMessage = useMutation(api.jointChat.sendUserMessage);
  const proposeClosure = useMutation(api.caseClosure.proposeClosure);

  // Network error toast (DesignDoc §6.2)
  const showNetworkError = useNetworkErrorToast();

  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessage({ caseId: typedCaseId, content });
      } catch (err) {
        showNetworkError(
          err instanceof Error ? err.message : "Failed to send message",
        );
      }
    },
    [sendMessage, typedCaseId, showNetworkError],
  );

  const handleProposeClosure = useCallback(async () => {
    try {
      await proposeClosure({ caseId: typedCaseId });
    } catch (err) {
      showNetworkError(
        err instanceof Error ? err.message : "Failed to propose closure",
      );
    }
  }, [proposeClosure, typedCaseId, showNetworkError]);

  const otherPartyName =
    partyData?.otherPhaseOnly?.displayName ??
    partyData?.otherPartyName ??
    "the other party";

  const isStreaming = useMemo(
    () =>
      (messagesData as Array<{ status: string }> | undefined)?.some(
        (m) => m.status === "STREAMING",
      ) ?? false,
    [messagesData],
  );

  // Loading state — skeleton chat bubbles per DesignDoc §6.3
  if (caseData === undefined || partyData === undefined) {
    return (
      <div className="flex h-screen flex-col">
        <div className="flex items-center gap-3 border-b border-border-default px-4 py-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex-1 flex flex-col gap-3 px-4 py-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
            >
              <Skeleton
                className={`h-16 rounded-lg ${i % 2 === 0 ? "w-2/3" : "w-1/2"}`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (caseData === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary">Case not found.</p>
      </div>
    );
  }

  // Gate: only JOINT_ACTIVE
  if (caseData.status !== "JOINT_ACTIVE") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">
          Joint session is not available for this case.
        </p>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="text-accent underline"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  const normalizedMessages: JointChatMessage[] = (
    (messagesData ?? []) as Array<{
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

  return (
    <>
      <JointChatView
        caseId={caseId}
        otherPartyName={otherPartyName}
        messages={normalizedMessages}
        initiatorUserId={caseData.initiatorUserId as string}
        currentUserId={partyData.self?._id as string}
        isStreaming={isStreaming}
        synthesisText={synthesisData?.synthesisText}
        onSendMessage={handleSendMessage}
        onOpenClosure={handleProposeClosure}
        onBack={() => navigate(`/cases/${caseId}`)}
      />
    </>
  );
}

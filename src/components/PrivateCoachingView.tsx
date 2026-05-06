import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { PrivacyBanner } from "./PrivacyBanner";
import { ChatWindow, type ChatMessage } from "./ChatWindow";
import { MessageInput } from "./MessageInput";
import { Skeleton } from "@/components/ui/skeleton";
import { useNetworkErrorToast } from "@/hooks/useNetworkErrorToast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Props-based presentational component (used directly by unit tests)
// ---------------------------------------------------------------------------

export interface PrivateCoachingViewProps {
  caseId?: Id<"cases">;
  otherPartyName: string;
  messages: Array<{
    _id: string;
    role: "USER" | "AI";
    content: string;
    status: "STREAMING" | "COMPLETE" | "ERROR";
    createdAt: number;
    [key: string]: unknown;
  }>;
  isCompleted: boolean;
  isStreaming: boolean;
  onSendMessage: (content: string) => void;
  onMarkComplete: () => void;
}

export function PrivateCoachingView({
  otherPartyName,
  messages,
  isCompleted,
  isStreaming,
  onSendMessage,
  onMarkComplete,
}: PrivateCoachingViewProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const focusRef = useRef<HTMLDivElement>(null);

  // Focus management on mount
  useEffect(() => {
    focusRef.current?.focus();
  }, []);

  const chatMessages: ChatMessage[] = useMemo(
    () =>
      messages.map((m) => ({
        _id: m._id,
        role: m.role as "USER" | "AI",
        content: m.content,
        status: m.status as "STREAMING" | "COMPLETE" | "ERROR",
        createdAt: m.createdAt,
      })),
    [messages],
  );

  const messageCount = chatMessages.length;

  const handleMarkComplete = () => {
    onMarkComplete();
    setConfirmOpen(false);
  };

  return (
    <div
      ref={focusRef}
      tabIndex={-1}
      className="flex h-screen flex-col outline-none"
    >
      {/* Privacy banner — persistent at top */}
      <PrivacyBanner
        text={`This conversation is private to you. ${otherPartyName} will never see any of it.`}
      />

      {/* Chat area — constrained to 1080px */}
      <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col overflow-hidden">
        <ChatWindow messages={chatMessages} isStreaming={isStreaming} />

        {isCompleted ? (
          /* Read-only status message after completion */
          <div className="flex items-center justify-center gap-2 border-t border-border-default px-4 py-4">
            <CheckCircle size={18} className="text-success" />
            <span className="text-body text-text-secondary">
              Private coaching complete. You can review your conversation above.
            </span>
          </div>
        ) : (
          <>
            {/* Message input */}
            <MessageInput
              onSend={onSendMessage}
              isStreaming={isStreaming}
              placeholder="Tell the Coach what's on your mind…"
            />

            {/* Footer CTA — not prominently placed */}
            <div className="flex justify-center border-t border-border-default px-4 py-2">
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <button
                    type="button"
                    className="text-meta text-text-tertiary underline decoration-dotted underline-offset-4 transition-colors hover:text-text-secondary"
                  >
                    Mark private coaching complete
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Ready to move on?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      You&apos;ve had {messageCount} messages with the Coach.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No, keep coaching</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMarkComplete}>
                      Yes, I&apos;m ready
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connected wrapper — uses Convex hooks, renders at /cases/:id/private
// ---------------------------------------------------------------------------

const ALLOWED_STATUSES = [
  "DRAFT_PRIVATE_COACHING",
  "BOTH_PRIVATE_COACHING",
] as const;

type CoachingMessageRecord = {
  _id: unknown;
  role: unknown;
  content: unknown;
  status: unknown;
  createdAt: unknown;
};

export function ConnectedPrivateCoachingView() {
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const caseId = caseIdParam as Id<"cases">;

  // Data queries
  const caseData = useQuery(api.cases.get, { caseId });
  const partyData = useQuery(api.cases.partyStates, { caseId });
  const messages = useQuery(api.privateCoaching.myMessages, { caseId });

  // Mutations
  const sendMessage = useMutation(api.privateCoaching.sendUserMessage);
  const markComplete = useMutation(api.privateCoaching.markComplete);

  // Network error toast (DesignDoc §6.2)
  const showNetworkError = useNetworkErrorToast();

  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessage({ caseId, content });
      } catch (err) {
        showNetworkError(
          err instanceof Error ? err.message : "Failed to send message",
        );
      }
    },
    [sendMessage, caseId, showNetworkError],
  );

  const handleMarkComplete = useCallback(async () => {
    try {
      await markComplete({ caseId });
    } catch (err) {
      showNetworkError(
        err instanceof Error ? err.message : "Failed to mark complete",
      );
    }
  }, [markComplete, caseId, showNetworkError]);

  // Derive state
  const isCompleted = partyData?.self?.privateCoachingCompletedAt != null;
  const otherPartyName =
    partyData?.otherPhaseOnly?.displayName ??
    partyData?.otherPartyName ??
    "the other party";

  const isStreaming = useMemo(
    () =>
      (messages as CoachingMessageRecord[] | undefined)?.some(
        (m) => m.status === "STREAMING",
      ) ?? false,
    [messages],
  );

  // State gating
  const caseStatus = caseData?.status;
  const isValidStatus =
    caseStatus != null &&
    (ALLOWED_STATUSES as readonly string[]).includes(caseStatus);

  if (caseData === undefined || partyData === undefined) {
    return (
      <div className="flex h-screen flex-col">
        <div className="px-4 py-3 border-b border-border-default">
          <Skeleton className="h-4 w-64" />
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

  if (!isValidStatus && !isCompleted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">
          Private coaching is not available for this case.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-accent underline"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  const normalizedMessages = ((messages ?? []) as CoachingMessageRecord[]).map((m) => ({
    _id: m._id as string,
    role: m.role as "USER" | "AI",
    content: m.content as string,
    status: m.status as "STREAMING" | "COMPLETE" | "ERROR",
    createdAt: m.createdAt as number,
  }));

  return (
    <>
      <PrivateCoachingView
        caseId={caseId}
        otherPartyName={otherPartyName}
        messages={normalizedMessages}
        isCompleted={isCompleted}
        isStreaming={isStreaming}
        onSendMessage={handleSendMessage}
        onMarkComplete={handleMarkComplete}
      />
    </>
  );
}

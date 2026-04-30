import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { PrivacyBanner } from "./PrivacyBanner";
import { ChatWindow, type ChatMessage } from "./ChatWindow";
import { MessageInput } from "./MessageInput";
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

const ALLOWED_STATUSES = [
  "DRAFT_PRIVATE_COACHING",
  "BOTH_PRIVATE_COACHING",
] as const;

export function PrivateCoachingView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const caseId = id as Id<"cases">;
  const focusRef = useRef<HTMLDivElement>(null);

  // Data queries
  const caseData = useQuery(api.cases.get, { caseId });
  const partyData = useQuery(api.cases.partyStates, { caseId });
  const messages = useQuery(api.privateCoaching.myMessages, { caseId });

  // Mutations
  const sendMessage = useMutation(api.privateCoaching.sendUserMessage);
  const markComplete = useMutation(api.privateCoaching.markComplete);

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Focus management on mount
  useEffect(() => {
    focusRef.current?.focus();
  }, []);

  // Derive state
  const isCompleted = partyData?.self?.privateCoachingCompletedAt != null;
  const otherPartyName =
    partyData?.otherPhaseOnly?.displayName ??
    partyData?.otherPartyName ??
    "the other party";

  const isStreaming = useMemo(
    () => messages?.some((m) => m.status === "STREAMING") ?? false,
    [messages],
  );

  const chatMessages: ChatMessage[] = useMemo(
    () =>
      (messages ?? []).map((m) => ({
        _id: m._id,
        role: m.role as "USER" | "AI",
        content: m.content,
        status: m.status as "STREAMING" | "COMPLETE" | "ERROR",
        createdAt: m.createdAt,
      })),
    [messages],
  );

  const messageCount = chatMessages.length;

  // State gating: redirect if case is not in a valid private coaching status
  const caseStatus = caseData?.status;
  const isValidStatus =
    caseStatus != null &&
    (ALLOWED_STATUSES as readonly string[]).includes(caseStatus);

  if (caseData === undefined || partyData === undefined) {
    // Still loading
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary">Loading…</p>
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

  // If not in valid status and not completed (read-only review), block access
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

  const handleSend = (content: string) => {
    sendMessage({ caseId, content });
  };

  const handleMarkComplete = () => {
    markComplete({ caseId });
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
              onSend={handleSend}
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
                      Ready to move on?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep coaching</AlertDialogCancel>
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

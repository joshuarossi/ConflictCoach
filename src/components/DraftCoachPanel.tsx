import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Lock, Sparkles, X } from "lucide-react";
import { ChatWindow, type ChatMessage } from "./ChatWindow";
import { MessageInput } from "./MessageInput";
import { DraftReadyCard } from "./DraftReadyCard";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props-based presentational component (used directly by unit tests)
// ---------------------------------------------------------------------------

export interface DraftCoachMessage {
  _id: string;
  role: "USER" | "AI";
  content: string;
  status: "STREAMING" | "COMPLETE" | "ERROR";
  createdAt: number;
}

export interface DraftCoachPanelProps {
  isOpen: boolean;
  onClose: () => void;
  otherPartyName: string;
  messages: DraftCoachMessage[];
  isStreaming?: boolean;
  finalDraft?: string | null;
  onSendMessage?: (content: string) => void;
  onDraftItForMe?: () => void;
  onSendFinalDraft?: () => void;
  onEditDraft?: (draftText: string) => void;
  onKeepRefining?: () => void;
  onDiscard?: () => void;
}

export function DraftCoachPanel({
  isOpen,
  onClose,
  otherPartyName,
  messages,
  isStreaming = false,
  finalDraft,
  onSendMessage,
  onDraftItForMe,
  onSendFinalDraft,
  onEditDraft,
  onKeepRefining,
  onDiscard,
}: DraftCoachPanelProps) {
  const [isDraftDismissed, setIsDraftDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  if (!isOpen) return null;

  const showDraftCard = !!finalDraft && !isDraftDismissed;

  const chatMessages: ChatMessage[] = messages.map((m) => ({
    _id: m._id,
    role: m.role,
    content: m.content,
    status: m.status,
    createdAt: m.createdAt,
    variant: "private" as const,
  }));

  const privacyText = `This is private to you. ${otherPartyName} can't see what you're discussing here.`;
  const tooltipText = `${otherPartyName} can't see any of this. Only the final message you send goes to the joint chat.`;

  const handleKeepRefining = () => {
    setIsDraftDismissed(true);
    onKeepRefining?.();
  };

  return (
    <div
      className={cn(
        "fixed z-40 flex flex-col bg-surface transition-transform duration-200",
        "shadow-3",
        isMobile
          ? // Mobile: full-screen bottom sheet
            "inset-0 bottom-sheet"
          : // Desktop: side panel 420px anchored right
            "inset-y-0 right-0 w-[420px] side-panel",
      )}
      role="complementary"
      aria-label="Draft Coach panel"
      data-testid="draft-coach-panel"
      data-layout={isMobile ? "bottom-sheet" : "side-panel"}
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-coach-accent" />
          <span className="text-label font-medium text-text-primary">
            Draft Coach
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-sm p-1 text-text-secondary hover:text-text-primary"
          aria-label="Close Draft Coach"
        >
          <X size={18} />
        </button>
      </header>

      {/* Privacy banner */}
      <div
        className="flex items-center gap-2 bg-private-tint px-4 py-2"
        role="region"
        aria-label="Privacy notice"
        data-testid="privacy-banner"
      >
        <span title={tooltipText} className="shrink-0 cursor-help">
          <Lock size={16} strokeWidth={1.5} aria-label="Lock icon" />
        </span>
        <span className="text-meta text-text-secondary">
          {privacyText}
        </span>
      </div>

      {/* Chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatWindow messages={chatMessages} isStreaming={isStreaming} />

        {/* Draft Ready Card — shown when finalDraft is set and not dismissed */}
        {showDraftCard && (
          <DraftReadyCard
            draftText={finalDraft!}
            onSend={() => onSendFinalDraft?.()}
            onEdit={() => onEditDraft?.(finalDraft!)}
            onKeepRefining={handleKeepRefining}
            onDiscard={() => onDiscard?.()}
          />
        )}

        {/* Input area with Draft it for me button */}
        {!showDraftCard && (
          <div className="border-t border-border-default">
            <MessageInput
              onSend={onSendMessage}
              isStreaming={isStreaming}
              placeholder="Tell the coach what you want to say…"
            />
            <div className="flex justify-end px-4 pb-3">
              <button
                type="button"
                onClick={onDraftItForMe}
                disabled={isStreaming}
                className="inline-flex items-center gap-1.5 rounded-sm border border-border-default bg-surface px-3 py-1.5 text-label text-text-secondary hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Draft it for me"
              >
                <Sparkles size={14} className="text-coach-accent" />
                Draft it for me
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connected wrapper — uses Convex hooks for real data
// ---------------------------------------------------------------------------

export interface ConnectedDraftCoachPanelProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: Id<"cases">;
  otherPartyName: string;
  /** Callback to drop draft text into joint chat input */
  onEditDraft?: (draftText: string) => void;
}

export function ConnectedDraftCoachPanel({
  isOpen,
  onClose,
  caseId,
  otherPartyName,
  onEditDraft,
}: ConnectedDraftCoachPanelProps) {
  const [sessionId, setSessionId] = useState<Id<"draftSessions"> | null>(null);

  // Queries
  const sessionData = useQuery(
    api.draftCoach.session,
    isOpen ? { caseId } : "skip",
  );

  // Mutations
  const startSession = useMutation(api.draftCoach.startSession);
  const sendMessage = useMutation(api.draftCoach.sendMessage);
  const sendFinalDraft = useMutation(api.draftCoach.sendFinalDraft);
  const discardSession = useMutation(api.draftCoach.discardSession);

  const activeSessionId = sessionData?.session?._id ?? sessionId;
  const finalDraft = sessionData?.session?.finalDraft ?? null;

  const messages: DraftCoachMessage[] = useMemo(
    () =>
      ((sessionData?.messages ?? []) as Array<{
        _id: unknown;
        role: unknown;
        content: unknown;
        status: unknown;
        createdAt: unknown;
      }>).map((m) => ({
        _id: m._id as string,
        role: m.role as "USER" | "AI",
        content: m.content as string,
        status: m.status as "STREAMING" | "COMPLETE" | "ERROR",
        createdAt: m.createdAt as number,
      })),
    [sessionData?.messages],
  );

  const isStreaming = useMemo(
    () => messages.some((m) => m.status === "STREAMING"),
    [messages],
  );

  const ensureSession = useCallback(async () => {
    if (activeSessionId) return activeSessionId;
    const newId = await startSession({ caseId });
    setSessionId(newId);
    return newId;
  }, [activeSessionId, startSession, caseId]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      const sid = await ensureSession();
      await sendMessage({ sessionId: sid, content });
    },
    [ensureSession, sendMessage],
  );

  const handleDraftItForMe = useCallback(async () => {
    const sid = await ensureSession();
    await sendMessage({
      sessionId: sid,
      content: "I'm ready. Please draft a message for me.",
    });
  }, [ensureSession, sendMessage]);

  const handleSendFinalDraft = useCallback(async () => {
    if (!activeSessionId) return;
    await sendFinalDraft({ sessionId: activeSessionId });
    onClose();
  }, [activeSessionId, sendFinalDraft, onClose]);

  const handleEditDraft = useCallback(
    (draftText: string) => {
      onEditDraft?.(draftText);
      onClose();
    },
    [onEditDraft, onClose],
  );

  const handleKeepRefining = useCallback(() => {
    // No-op: just dismiss the card by clearing finalDraft would require
    // a backend call, but per AC "Keep refining" returns to the coaching
    // conversation. The finalDraft will remain but user can continue chatting.
    // For now the panel stays open and user can send more messages.
  }, []);

  const handleDiscard = useCallback(async () => {
    if (!activeSessionId) return;
    await discardSession({ sessionId: activeSessionId });
    setSessionId(null);
    onClose();
  }, [activeSessionId, discardSession, onClose]);

  return (
    <DraftCoachPanel
      isOpen={isOpen}
      onClose={onClose}
      otherPartyName={otherPartyName}
      messages={messages}
      isStreaming={isStreaming}
      finalDraft={finalDraft}
      onSendMessage={handleSendMessage}
      onDraftItForMe={handleDraftItForMe}
      onSendFinalDraft={handleSendFinalDraft}
      onEditDraft={handleEditDraft}
      onKeepRefining={handleKeepRefining}
      onDiscard={handleDiscard}
    />
  );
}

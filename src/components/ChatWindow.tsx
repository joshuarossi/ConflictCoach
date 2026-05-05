import { useEffect, useRef } from "react";
import { MessageBubble, type MessageBubbleProps } from "./MessageBubble";
import { StreamingIndicator } from "./StreamingIndicator";

export interface ChatMessage extends MessageBubbleProps {
  _id: string;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  onSendMessage?: (content: string) => void;
  isInputDisabled?: boolean;
  showPrivacyBanner?: boolean;
  authorColorMap?: Partial<Record<"USER" | "COACH" | "AI" | "SYSTEM" | string, string>>;
}

const AT_BOTTOM_TOLERANCE_PX = 8;

export function ChatWindow({
  messages,
  isStreaming = false,
  showPrivacyBanner = false,
  authorColorMap,
}: ChatWindowProps) {
  const logRef = useRef<HTMLDivElement>(null);
  // Tracks whether the user is currently scrolled to (near) the bottom.
  // Auto-scroll only fires when this is true.
  const stickyToBottomRef = useRef(true);

  const lastMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;

    const handleScroll = () => {
      const distanceFromBottom =
        log.scrollHeight - log.scrollTop - log.clientHeight;
      stickyToBottomRef.current = distanceFromBottom <= AT_BOTTOM_TOLERANCE_PX;
    };

    log.addEventListener("scroll", handleScroll);
    return () => log.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (!stickyToBottomRef.current) return;
    if (typeof log.scrollTo === "function") {
      log.scrollTo({ top: log.scrollHeight, behavior: "smooth" });
    } else {
      log.scrollTop = log.scrollHeight;
    }
  }, [messages.length, lastMessageContent]);

  return (
    <div
      ref={logRef}
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
      className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
    >
      {showPrivacyBanner && (
        <div data-testid="privacy-banner" className="sr-only">
          Private conversation
        </div>
      )}
      {messages.map((msg) => {
        const colorKey =
          (msg.authorType as string | undefined) ??
          (msg.role === "AI" ? "COACH" : msg.role);
        const authorColor = colorKey
          ? authorColorMap?.[colorKey] ?? msg.authorColor
          : msg.authorColor;
        return (
          <MessageBubble
            key={msg._id}
            role={msg.role}
            authorType={msg.authorType}
            authorName={msg.authorName}
            authorColor={authorColor}
            content={msg.content}
            status={msg.status}
            createdAt={msg.createdAt}
            onCopy={msg.onCopy}
            onRetry={msg.onRetry}
            variant={msg.variant}
            partyRole={msg.partyRole}
            isIntervention={msg.isIntervention}
          />
        );
      })}

      {isStreaming && !messages.some((m) => m.status === "STREAMING") && (
        <StreamingIndicator />
      )}
    </div>
  );
}

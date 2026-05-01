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
  authorColorMap?: Partial<Record<"USER" | "COACH" | "AI", string>>;
}

export function ChatWindow({
  messages,
  isStreaming = false,
  showPrivacyBanner = false,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const announcedRef = useRef(false);

  // Auto-scroll to bottom on new messages
  const lastMessageContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, lastMessageContent]);

  // Announce streaming start once per streaming session
  useEffect(() => {
    if (isStreaming && !announcedRef.current) {
      announcedRef.current = true;
    } else if (!isStreaming) {
      announcedRef.current = false;
    }
  }, [isStreaming]);

  return (
    <div
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
      {messages.map((msg) => (
        <MessageBubble
          key={msg._id}
          role={msg.role}
          content={msg.content}
          status={msg.status}
          createdAt={msg.createdAt}
        />
      ))}

      {isStreaming && !messages.some((m) => m.status === "STREAMING") && (
        <StreamingIndicator />
      )}

      <div ref={bottomRef} />
    </div>
  );
}

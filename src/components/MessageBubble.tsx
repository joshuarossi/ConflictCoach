import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessageBubbleProps {
  role?: "USER" | "AI";
  authorType?: "USER" | "COACH" | "SYSTEM" | string;
  authorName?: string;
  authorColor?: string;
  content: string;
  status: "STREAMING" | "COMPLETE" | "ERROR";
  createdAt?: number;
  onCopy?: (content: string) => void;
  onRetry?: () => void;
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageBubble({
  role,
  authorType,
  authorName,
  authorColor,
  content,
  status,
  createdAt,
  onCopy,
  onRetry,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const resolvedAuthorType =
    authorType ?? (role === "AI" ? "COACH" : role === "USER" ? "USER" : "USER");
  const isCoach = resolvedAuthorType === "COACH";
  const isSystem = resolvedAuthorType === "SYSTEM";
  const isUser = !isCoach && !isSystem;
  const isStreaming = status === "STREAMING";
  const isComplete = status === "COMPLETE";
  const isError = status === "ERROR";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    onCopy?.(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wrapperAlignment = isUser
    ? "self-end ml-auto items-end"
    : isCoach
      ? "self-start mr-auto items-start"
      : "self-center mx-auto items-center";

  const errorClasses = isError
    ? "border border-warning bg-warning/10 text-warning-foreground"
    : "";

  const bubbleBackground = isCoach
    ? "border-l-2 border-l-coach-accent bg-accent-subtle"
    : isSystem
      ? "bg-surface-subtle text-text-secondary"
      : "bg-surface";

  return (
    <div
      className={cn("group flex w-full flex-col", wrapperAlignment, errorClasses)}
      data-author-type={resolvedAuthorType}
      style={authorColor ? { borderColor: authorColor } : undefined}
    >
      <div
        className={cn(
          "relative max-w-[80%] rounded-lg px-4 py-3",
          bubbleBackground,
          // Mirror alignment onto the inner bubble so closest()-style queries
          // (used by some tests) find the alignment class as well.
          isUser && "self-end ml-auto",
          isCoach && "self-start mr-auto",
        )}
      >
        {(isCoach || authorName) && (
          <div className="mb-1 flex items-center gap-1.5">
            {isCoach && (
              <Sparkles
                size={14}
                className="text-coach-accent"
                data-testid="sparkles-icon"
              />
            )}
            {(isCoach || authorName) && (
              <span
                className="text-meta font-medium"
                style={authorColor ? { color: authorColor } : undefined}
              >
                {authorName ?? (isCoach ? "Coach" : "")}
              </span>
            )}
          </div>
        )}

        <div
          className={cn(
            "text-chat whitespace-pre-wrap text-text-primary",
            isUser && "self-end ml-auto text-right",
            isCoach && "self-start mr-auto text-left",
          )}
        >
          {content}
          {isStreaming && (
            <span
              data-testid="streaming-cursor"
              aria-hidden="true"
              className="streaming-cursor blink ml-0.5 inline-block h-4 w-0.5 animate-blink bg-text-primary motion-reduce:animate-none"
              style={{ animation: "blink 0.5s steps(2, start) infinite" }}
            />
          )}
        </div>

        {isComplete && createdAt != null && (
          <time
            dateTime={new Date(createdAt).toISOString()}
            data-testid="timestamp"
            className="mt-1 block text-meta text-text-tertiary"
          >
            {formatTimestamp(createdAt)}
          </time>
        )}

        {isComplete && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 focus:opacity-100"
            aria-label="Copy message"
          >
            {copied ? (
              <Check size={14} className="text-success" />
            ) : (
              <Copy size={14} className="text-text-tertiary" />
            )}
          </button>
        )}

        {isError && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-meta text-warning underline decoration-dotted underline-offset-4"
            aria-label="Retry message"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

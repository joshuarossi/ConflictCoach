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
  onCopy?: () => void;
  onRetry?: () => void;
}

export function MessageBubble({
  role,
  authorType,
  content,
  status,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const resolvedRole = role ?? (authorType === "USER" ? "USER" : "AI");
  const isCoach = resolvedRole === "AI";
  const isStreaming = status === "STREAMING";
  const isComplete = status === "COMPLETE";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group flex w-full",
        isCoach ? "justify-start" : "justify-end",
      )}
    >
      <div
        className={cn(
          "relative max-w-[80%] rounded-lg px-4 py-3",
          isCoach
            ? "border-l-2 border-l-coach-accent bg-accent-subtle"
            : "bg-surface",
        )}
      >
        {isCoach && (
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles size={14} className="text-coach-accent" data-testid="sparkles-icon" />
            <span className="text-meta font-medium text-coach-accent">
              Coach
            </span>
          </div>
        )}

        <div
          className={cn(
            "text-chat whitespace-pre-wrap text-text-primary",
            !isCoach && "self-end",
          )}
        >
          {content}
          {isStreaming && (
            <span
              className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-text-primary"
              aria-hidden="true"
            />
          )}
        </div>

        {isCoach && isComplete && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100"
            aria-label="Copy message"
          >
            {copied ? (
              <Check size={14} className="text-success" />
            ) : (
              <Copy size={14} className="text-text-tertiary" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

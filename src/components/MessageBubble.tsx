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
  /** "private" (default) or "joint" — controls avatar, bubble classes, glyph, timestamp hover */
  variant?: "private" | "joint";
  /** Party role for joint-chat styling: determines avatar and bubble color classes */
  partyRole?: "INITIATOR" | "INVITEE";
  /** Whether this coach message is an intervention (uses heavier border) */
  isIntervention?: boolean;
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
  variant = "private",
  partyRole,
  isIntervention = false,
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
  const isJoint = variant === "joint";

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

  // Joint-chat bubble classes per DesignDoc StyleGuide
  const jointBubbleClass = isJoint
    ? isCoach
      ? isIntervention
        ? "bubble-coach-intervention"
        : "bubble-coach-joint"
      : partyRole === "INITIATOR"
        ? "bubble-party-initiator"
        : partyRole === "INVITEE"
          ? "bubble-party-invitee"
          : ""
    : "";

  const bubbleBackground = isCoach
    ? isJoint && isIntervention
      ? "border-l-4 border-l-coach-accent bg-coach-subtle"
      : isJoint
        ? "border-l-[3px] border-l-coach-accent bg-coach-subtle"
        : "border-l-2 border-l-coach-accent bg-accent-subtle"
    : isSystem
      ? "bg-surface-subtle text-text-secondary"
      : isJoint && partyRole === "INITIATOR"
        ? "bg-party-initiator-subtle"
        : isJoint && partyRole === "INVITEE"
          ? "bg-party-invitee-subtle"
          : "bg-surface";

  // Avatar class for joint chat
  const avatarClass = isJoint
    ? isCoach
      ? "avatar-coach"
      : partyRole === "INITIATOR"
        ? "avatar-initiator"
        : partyRole === "INVITEE"
          ? "avatar-invitee"
          : ""
    : "";

  const avatarBg = isJoint
    ? isCoach
      ? "bg-coach-accent"
      : partyRole === "INITIATOR"
        ? "bg-party-initiator"
        : partyRole === "INVITEE"
          ? "bg-party-invitee"
          : "bg-surface-subtle"
    : "";

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "group flex w-full flex-col",
        wrapperAlignment,
        errorClasses,
      )}
      data-author-type={resolvedAuthorType}
      data-hovered={isHovered ? "true" : "false"}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={authorColor ? { borderColor: authorColor } : undefined}
    >
      <div
        className={cn("flex max-w-[80%] gap-2", isUser && "flex-row-reverse")}
      >
        {/* Avatar — joint variant only */}
        {isJoint && (
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-timestamp font-medium text-accent-on",
              avatarClass,
              avatarBg,
            )}
            aria-hidden="true"
          >
            {isCoach
              ? "\u27E1"
              : (authorName?.[0]?.toUpperCase() ??
                (partyRole === "INITIATOR" ? "I" : "V"))}
          </div>
        )}

        <div
          className={cn(
            "relative rounded-lg px-4 py-3",
            bubbleBackground,
            jointBubbleClass,
            isUser && !isJoint && "self-end ml-auto",
            isCoach && !isJoint && "self-start mr-auto",
          )}
        >
          {(isCoach || authorName) && (
            <div className="mb-1 flex items-center gap-1.5">
              {isCoach && isJoint && (
                <span className="text-coach-accent" aria-hidden="true">
                  {"\u27E1"}
                </span>
              )}
              {isCoach && !isJoint && (
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
              isUser && !isJoint && "self-end ml-auto text-right",
              isCoach && !isJoint && "self-start mr-auto text-left",
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

          {createdAt != null && (
            <time
              dateTime={new Date(createdAt).toISOString()}
              data-testid="timestamp"
              className={cn(
                "mt-1 block text-meta text-text-tertiary",
                isJoint &&
                  (isHovered
                    ? "opacity-100 transition-opacity"
                    : "opacity-0 transition-opacity"),
                !isJoint && !isComplete && "hidden",
              )}
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
    </div>
  );
}

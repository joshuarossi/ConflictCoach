import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MessageInputProps {
  onSend: (content: string) => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  isStreaming = false,
  disabled = false,
  placeholder = "Type a message…",
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, isStreaming, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const canSend = value.trim().length > 0 && !isStreaming;

  return (
    <div
      className={cn(
        "flex items-end gap-2 border-t border-border-default px-4 py-3",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-md border border-border-default bg-surface px-3 py-2 text-chat text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed"
        aria-label="Message input"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isStreaming}
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors",
          canSend
            ? "bg-accent text-accent-on hover:bg-accent-hover"
            : "bg-surface-subtle text-text-tertiary",
        )}
        aria-label="Send message"
      >
        <Send size={18} />
      </button>
    </div>
  );
}

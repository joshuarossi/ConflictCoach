import { Sparkles, Send, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DraftReadyCardProps {
  draftText: string;
  onSend: () => void;
  onEdit: () => void;
  onKeepRefining: () => void;
  onDiscard: () => void;
}

export function DraftReadyCard({
  draftText,
  onSend,
  onEdit,
  onKeepRefining,
  onDiscard,
}: DraftReadyCardProps) {
  return (
    <div
      className={cn(
        "mx-4 my-3 rounded-[var(--radius-md)] border-l-4 border-l-[var(--coach-accent)] bg-[var(--coach-subtle)] p-4",
        "shadow-[var(--shadow-2)]",
      )}
      data-testid="draft-ready-card"
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--coach-accent)]">
        <Sparkles size={14} />
        <span>Your draft is ready</span>
      </div>

      {/* Draft text */}
      <div className="mb-4 whitespace-pre-wrap rounded-[var(--radius-sm)] bg-[var(--bg-surface)] p-3 text-sm text-[var(--text-primary)]">
        {draftText}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSend}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--accent-on)] hover:bg-[var(--accent-hover)]"
          aria-label="Send this message"
        >
          <Send size={14} />
          Send this message
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)]"
          aria-label="Edit before sending"
        >
          <Pencil size={14} />
          Edit before sending
        </button>
        <button
          type="button"
          onClick={onKeepRefining}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface-subtle)]"
          aria-label="Keep refining with Coach"
        >
          <RefreshCw size={14} />
          Keep refining with Coach
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm text-[var(--danger)] hover:bg-[var(--danger-subtle)]"
          aria-label="Discard"
        >
          <Trash2 size={14} />
          Discard
        </button>
      </div>
    </div>
  );
}

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
        "mx-4 my-3 rounded-md border-l-4 border-l-coach-accent bg-coach-subtle p-4",
        "shadow-2",
      )}
      data-testid="draft-ready-card"
    >
      {/* Header */}
      <div className="mb-2 flex items-center gap-1.5 text-label font-medium text-coach-accent">
        <Sparkles size={14} />
        <span>Your draft is ready</span>
      </div>

      {/* Draft text */}
      <div
        data-testid="draft-text-content"
        className="mb-4 whitespace-pre-wrap rounded-sm bg-surface p-3 text-label text-text-primary"
      >
        {draftText}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSend}
          className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-3 py-1.5 text-label font-medium text-accent-on hover:bg-accent-hover"
          aria-label="Send this message"
        >
          <Send size={14} />
          Send this message
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border-default bg-surface px-3 py-1.5 text-label text-text-secondary hover:bg-surface-subtle"
          aria-label="Edit before sending"
        >
          <Pencil size={14} />
          Edit before sending
        </button>
        <button
          type="button"
          onClick={onKeepRefining}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border-default bg-surface px-3 py-1.5 text-label text-text-secondary hover:bg-surface-subtle"
          aria-label="Keep refining with Coach"
        >
          <RefreshCw size={14} />
          Keep refining with Coach
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border-default bg-surface px-3 py-1.5 text-label text-danger hover:bg-danger-subtle"
          aria-label="Discard"
        >
          <Trash2 size={14} />
          Discard
        </button>
      </div>
    </div>
  );
}

export interface ClosureConfirmationBannerProps {
  proposerName: string;
  summaryText?: string;
  onConfirm: () => void;
  onReject: () => void;
}

export function ClosureConfirmationBanner({
  proposerName,
  summaryText,
  onConfirm,
  onReject,
}: ClosureConfirmationBannerProps) {
  return (
    <div
      className="mx-4 mb-2 rounded-md border border-accent/30 bg-accent/5 px-4 py-3"
      role="status"
    >
      <p className="text-body font-medium text-text-primary">
        {proposerName} has proposed resolving this case.
      </p>
      {summaryText && (
        <p className="mt-1 text-sm text-text-secondary">
          Their summary: <q>{summaryText}</q>
        </p>
      )}
      <p className="mt-1 text-sm text-text-secondary">
        This closes the case for both of you.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-on hover:bg-accent-hover"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={onReject}
          className="inline-flex h-9 items-center rounded-md border border-border-default bg-surface px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle"
        >
          Reject and keep talking
        </button>
      </div>
    </div>
  );
}

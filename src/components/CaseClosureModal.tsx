import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type ClosureOption = "resolved" | "not_resolved" | "take_a_break";

export interface CaseClosureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherPartyName?: string;
  onProposeClosure: (summary: string) => void;
  onUnilateralClose: (reason?: string) => void;
  /** Called when the user selects "Take a break" (case stays JOINT_ACTIVE) */
  onTakeABreak?: () => void;
}

export function CaseClosureModal({
  open,
  onOpenChange,
  otherPartyName = "the other party",
  onProposeClosure,
  onUnilateralClose,
  onTakeABreak,
}: CaseClosureModalProps) {
  const [selected, setSelected] = useState<ClosureOption>("resolved");
  const [summary, setSummary] = useState("");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleClose = () => {
    setSelected("resolved");
    setSummary("");
    setReason("");
    setValidationError(null);
    onOpenChange(false);
  };

  const handleProposeResolution = () => {
    if (!summary.trim()) {
      setValidationError("Please describe what you agreed to.");
      return;
    }
    setValidationError(null);
    onProposeClosure(summary.trim());
    handleClose();
  };

  const handleCloseWithoutResolution = () => {
    setValidationError(null);
    onUnilateralClose(reason.trim() || undefined);
    handleClose();
  };

  const handleTakeABreak = () => {
    onTakeABreak?.();
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        role="dialog"
        aria-modal="true"
      >
        <DialogHeader>
          <DialogTitle>Close this case</DialogTitle>
          <DialogDescription>
            Choose how you&apos;d like to close this case.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Option selector */}
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Closure option</legend>

            <label
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 ${
                selected === "resolved"
                  ? "border-accent bg-accent/5"
                  : "border-border-default"
              }`}
            >
              <input
                type="radio"
                name="closure-option"
                value="resolved"
                checked={selected === "resolved"}
                onChange={() => {
                  setSelected("resolved");
                  setValidationError(null);
                }}
                className="accent-accent"
              />
              <span className="text-body font-medium text-text-primary">Resolved</span>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 ${
                selected === "not_resolved"
                  ? "border-warning bg-warning/5"
                  : "border-border-default"
              }`}
            >
              <input
                type="radio"
                name="closure-option"
                value="not_resolved"
                checked={selected === "not_resolved"}
                onChange={() => {
                  setSelected("not_resolved");
                  setValidationError(null);
                }}
                className="accent-warning"
              />
              <span className="text-body font-medium text-text-primary">Not resolved</span>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 ${
                selected === "take_a_break"
                  ? "border-accent bg-accent/5"
                  : "border-border-default"
              }`}
            >
              <input
                type="radio"
                name="closure-option"
                value="take_a_break"
                checked={selected === "take_a_break"}
                onChange={() => {
                  setSelected("take_a_break");
                  setValidationError(null);
                }}
                className="accent-accent"
              />
              <span className="text-body font-medium text-text-primary">Take a break</span>
            </label>
          </fieldset>

          {/* Resolved panel */}
          {selected === "resolved" && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="closure-summary"
                className="text-label font-medium text-text-primary"
              >
                Briefly describe what you agreed to.
              </label>
              <textarea
                id="closure-summary"
                rows={5}
                value={summary}
                onChange={(e) => {
                  setSummary(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="w-full resize-none rounded-md border border-border-default bg-surface px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Describe the resolution…"
                required
              />
              {validationError && (
                <p className="text-sm text-red-600" role="alert">
                  {validationError}
                </p>
              )}
              <p className="text-sm text-text-secondary">
                {otherPartyName} will see this summary and confirm. The case
                won&apos;t close until you both agree.
              </p>
              <p className="text-sm text-text-secondary">
                This closes the case for both of you.
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-9 items-center rounded-md border border-border-default bg-surface px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProposeResolution}
                  className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-on hover:bg-accent-hover"
                >
                  Propose Resolution
                </button>
              </div>
            </div>
          )}

          {/* Not resolved panel */}
          {selected === "not_resolved" && (
            <div className="flex flex-col gap-2">
              <div className="rounded-md border border-warning bg-warning/10 px-3 py-2">
                <p className="text-sm font-medium text-warning">
                  This closes the case immediately for both of you. You can
                  reopen by starting a new case.
                </p>
              </div>
              <label
                htmlFor="closure-reason"
                className="text-label font-medium text-text-primary"
              >
                Anything you want {otherPartyName} to know? (optional)
              </label>
              <textarea
                id="closure-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full resize-none rounded-md border border-border-default bg-surface px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Optional note…"
              />
              <p className="text-sm text-text-secondary">
                This closes the case for both of you.
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-9 items-center rounded-md border border-border-default bg-surface px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCloseWithoutResolution}
                  className="inline-flex h-9 items-center rounded-md bg-warning px-4 text-sm font-medium text-white hover:bg-warning/90"
                >
                  Close without resolution
                </button>
              </div>
            </div>
          )}

          {/* Take a break panel */}
          {selected === "take_a_break" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-secondary">
                The case will stay open. You can come back any time.
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-9 items-center rounded-md border border-border-default bg-surface px-4 text-sm font-medium text-text-primary hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleTakeABreak}
                  className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-on hover:bg-accent-hover"
                >
                  Take a break
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

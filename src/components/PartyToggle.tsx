import { useSearchParams } from "react-router-dom";

/**
 * Segmented control for toggling between Initiator and Invitee views
 * in solo mode cases. Persists state via the `?as` URL query param.
 *
 * Styled per style-guide §12 — raised-chip segmented control on a
 * coach-subtle track with coach-accent border/label.
 */
export function PartyToggle() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeParty = searchParams.get("as") ?? "initiator";

  function setParty(party: "initiator" | "invitee") {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("as", party);
      return next;
    });
  }

  return (
    <div
      className="inline-flex items-center rounded-md border border-coach-accent bg-coach-subtle p-0.5"
      role="group"
      aria-label="Party toggle"
      data-testid="party-toggle"
    >
      <span className="px-2 text-[11px] font-medium uppercase tracking-[0.05em] text-coach-accent">
        VIEWING AS
      </span>
      <button
        type="button"
        onClick={() => setParty("initiator")}
        className={`rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors ${
          activeParty === "initiator"
            ? "bg-surface text-text-primary shadow-1"
            : "text-text-secondary hover:text-text-primary"
        }`}
        aria-pressed={activeParty === "initiator"}
        data-testid="toggle-initiator"
      >
        Alex
      </button>
      <button
        type="button"
        onClick={() => setParty("invitee")}
        className={`rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors ${
          activeParty === "invitee"
            ? "bg-surface text-text-primary shadow-1"
            : "text-text-secondary hover:text-text-primary"
        }`}
        aria-pressed={activeParty === "invitee"}
        data-testid="toggle-invitee"
      >
        Jordan
      </button>
    </div>
  );
}

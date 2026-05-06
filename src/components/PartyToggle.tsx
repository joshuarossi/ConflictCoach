import { useSearchParams } from "react-router-dom";

/**
 * Segmented control for toggling between Initiator and Invitee views
 * in solo mode cases. Persists state via the `?as` URL query param.
 *
 * Styled with --coach-accent color token per DesignDoc D6.
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
      className="inline-flex rounded-md border border-[var(--coach-accent,#6366f1)] overflow-hidden"
      role="group"
      aria-label="Party toggle"
      data-testid="party-toggle"
    >
      <button
        type="button"
        onClick={() => setParty("initiator")}
        className={`px-3 py-1 text-sm font-medium transition-colors ${
          activeParty === "initiator"
            ? "bg-[var(--coach-accent,#6366f1)] text-white"
            : "bg-white text-[var(--coach-accent,#6366f1)] hover:bg-gray-50"
        }`}
        aria-pressed={activeParty === "initiator"}
        data-testid="toggle-initiator"
      >
        Viewing as Alex
      </button>
      <button
        type="button"
        onClick={() => setParty("invitee")}
        className={`px-3 py-1 text-sm font-medium transition-colors ${
          activeParty === "invitee"
            ? "bg-[var(--coach-accent,#6366f1)] text-white"
            : "bg-white text-[var(--coach-accent,#6366f1)] hover:bg-gray-50"
        }`}
        aria-pressed={activeParty === "invitee"}
        data-testid="toggle-invitee"
      >
        Viewing as Jordan
      </button>
    </div>
  );
}

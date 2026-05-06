/**
 * Prominent banner displayed at the top of solo-mode case views,
 * indicating the user is playing both parties.
 */
export function SoloBanner() {
  return (
    <div
      className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm font-medium text-amber-800"
      data-testid="solo-banner"
    >
      Solo Mode — You are playing both parties
    </div>
  );
}

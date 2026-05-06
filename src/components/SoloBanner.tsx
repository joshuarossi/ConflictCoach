/**
 * Prominent banner displayed at the top of solo-mode case views,
 * indicating the user is playing both parties.
 */
export function SoloBanner() {
  return (
    <div
      className="bg-warning-subtle border-b border-warning px-4 py-2 text-center text-label font-medium text-warning"
      data-testid="solo-banner"
    >
      Solo Mode — You are playing both parties
    </div>
  );
}

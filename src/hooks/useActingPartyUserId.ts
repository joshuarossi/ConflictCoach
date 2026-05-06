import { useSearchParams } from "react-router-dom";

interface PartyState {
  userId: string;
  role: "INITIATOR" | "INVITEE";
}

/**
 * Returns the userId for the currently acting party in a case.
 *
 * In solo mode, reads the `?as=initiator|invitee` URL query param to determine
 * which party the user is viewing as. Defaults to "initiator" when absent.
 *
 * In normal (non-solo) mode, returns the authenticated user's own userId
 * (same as the single matching partyState).
 */
export function useActingPartyUserId(
  partyStates: PartyState[] | null | undefined,
): string | null {
  const [searchParams] = useSearchParams();
  const asParam = searchParams.get("as") ?? "initiator";

  if (!partyStates || partyStates.length === 0) return null;

  const targetRole = asParam === "invitee" ? "INVITEE" : "INITIATOR";
  const matchingState = partyStates.find((ps) => ps.role === targetRole);

  return matchingState?.userId ?? null;
}

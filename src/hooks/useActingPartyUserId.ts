import { useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Returns the userId for the currently acting party in a case.
 *
 * In solo mode, reads the `?as=initiator|invitee` URL query param to determine
 * which party the user is viewing as. Defaults to "initiator" when absent.
 *
 * Fetches party states via `api.cases.partyStates` internally.
 */
export function useActingPartyUserId(
  caseId: Id<"cases"> | undefined,
): string | null {
  const [searchParams] = useSearchParams();
  const asParam = searchParams.get("as") ?? "initiator";

  const partyData = useQuery(
    api.cases.partyStates,
    caseId ? { caseId } : "skip",
  );

  if (!partyData?.all || partyData.all.length === 0) return null;

  const targetRole = asParam === "invitee" ? "INVITEE" : "INITIATOR";
  const matchingState = partyData.all.find(
    (ps: { userId: string; role: string }) => ps.role === targetRole,
  );

  return matchingState?.userId ?? null;
}

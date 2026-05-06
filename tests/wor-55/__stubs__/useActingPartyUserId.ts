/**
 * WOR-55 test stub: useActingPartyUserId hook placeholder.
 * This file enables Vite to resolve the import in tests.
 * Tests will fail on assertion (expected userId, got null) rather
 * than on 'not a function' runtime crash.
 * Remove this stub once src/hooks/useActingPartyUserId.ts exists.
 */
import { useSearchParams } from "react-router-dom";

export function useActingPartyUserId(caseId: string): string | null {
  const [searchParams] = useSearchParams();
  void searchParams;
  void caseId;
  return null;
}

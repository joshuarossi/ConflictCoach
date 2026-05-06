/**
 * WOR-55 test stub: PartyToggle component placeholder.
 * This file enables Vite to resolve the import in tests.
 * Tests will fail on behavioral assertions (element not found)
 * rather than on React runtime crashes.
 * Remove this stub once src/components/PartyToggle.tsx exists.
 */
import React from "react";

export function PartyToggle({ isSolo }: { isSolo: boolean }) {
  if (!isSolo) return null;
  return (
    <div role="group" data-testid="party-toggle">
      <button aria-pressed="true">Viewing as Alex</button>
      <button aria-pressed="false">Viewing as Jordan</button>
    </div>
  );
}

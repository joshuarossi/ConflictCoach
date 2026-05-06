import { useState, useCallback } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Copy, Check, Mail } from "lucide-react";

// ---------------------------------------------------------------------------
// Props-based presentational component (exported for unit tests)
// ---------------------------------------------------------------------------

export interface InviteSharingViewProps {
  otherPartyName: string;
  inviteUrl: string;
  mainTopic: string;
  caseId: string;
}

export function InviteSharingView({
  otherPartyName,
  inviteUrl,
  mainTopic,
  caseId,
}: InviteSharingViewProps) {
  const displayName = otherPartyName || "the other party";
  const [copiedButton, setCopiedButton] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  const suggestedLanguage = `Hey ${displayName} — I found this thing called Conflict Coach. It's a private tool that helps two people work through something difficult together with an AI mediator. I thought it might help us work through the ${mainTopic}. Here's a link to join: ${inviteUrl}. No pressure — let me know what you think.`;

  const shortText = `Check out Conflict Coach — it might help us work through things: ${inviteUrl}`;

  const handleCopy = useCallback(
    async (text: string, buttonId: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedButton(buttonId);
        setTimeout(() => setCopiedButton(null), 2000);
      } catch {
        // Clipboard API unavailable — the link is already visible in the
        // readonly input so users can select and copy manually.
      }
    },
    [],
  );

  const mailtoSubject = encodeURIComponent(`About our ${mainTopic}`);
  const mailtoBody = encodeURIComponent(suggestedLanguage);
  const mailtoHref = `mailto:?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6">
      {/* AC1: Heading with name */}
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
        Your case is ready. Send this link to {displayName}.
      </h1>

      {/* AC2: Copyable link field */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 mb-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="flex-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-canvas)] px-3 py-2 font-mono text-sm text-[var(--text-primary)] select-all focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            onFocus={(e) => e.target.select()}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopy(inviteUrl, "copy-link")}
            className="shrink-0"
            aria-label="Copy link to clipboard"
          >
            {copiedButton === "copy-link" ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy link
              </>
            )}
          </Button>
        </div>
      </div>

      {/* AC3: Three share options */}
      <div className="flex flex-col gap-3 mb-6">
        <a
          href={mailtoHref}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors"
        >
          <Mail className="h-4 w-4" />
          Copy for email
        </a>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleCopy(shortText, "copy-text")}
        >
          {copiedButton === "copy-text" ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied!
            </>
          ) : (
            "Copy for text message"
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleCopy(inviteUrl, "just-copy")}
        >
          {copiedButton === "just-copy" ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Copied!
            </>
          ) : (
            "Just copy link"
          )}
        </Button>
      </div>

      {/* AC4: Expandable suggested language */}
      <Collapsible open={suggestionsOpen} onOpenChange={setSuggestionsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 w-full rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
          >
            {suggestionsOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            What should I tell them?
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mb-6">
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
            {suggestedLanguage}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* AC5: Secondary CTA */}
      <div className="text-center">
        <Link
          to={`/cases/${caseId}/private`}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          Or, start your private coaching now &rarr;
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connected wrapper — uses Convex hooks, renders at /cases/:caseId/invite
// ---------------------------------------------------------------------------

export function InviteSharingPage() {
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const location = useLocation();
  const caseId = caseIdParam as Id<"cases">;

  // inviteUrl and otherPartyName come from Router state (set by NewCasePage)
  const state = location.state as {
    inviteUrl?: string;
    otherPartyName?: string;
    mainTopic?: string;
  } | null;

  const inviteUrl = state?.inviteUrl;

  // Fetch case data for otherPartyName fallback and mainTopic
  const caseData = useQuery(api.cases.get, { caseId });
  const partyData = useQuery(api.cases.partyStates, { caseId });

  // Missing inviteUrl (direct navigation / page refresh)
  if (!inviteUrl) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-6 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
          This link is no longer available.
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Check your case dashboard.
        </p>
        <Link
          to="/dashboard"
          className="text-sm text-[var(--accent)] hover:underline"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  // Loading state
  if (caseData === undefined || partyData === undefined) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-96" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  // Not found
  if (caseData === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-[var(--text-secondary)]">Case not found.</p>
      </div>
    );
  }

  // Resolve otherPartyName: Router state > api.cases.get > fallback
  const otherPartyName =
    state?.otherPartyName ||
    (caseData.otherPartyName as string) ||
    "";

  // Resolve mainTopic: Router state > partyStates self.mainTopic
  const partyDataAny = partyData as Record<string, unknown>;
  const selfRecord = partyDataAny?.self as Record<string, unknown> | undefined;
  const mainTopic =
    state?.mainTopic ||
    (selfRecord?.mainTopic as string) ||
    "";

  return (
    <InviteSharingView
      otherPartyName={otherPartyName}
      inviteUrl={inviteUrl}
      mainTopic={mainTopic}
      caseId={caseIdParam!}
    />
  );
}

export default InviteSharingPage;

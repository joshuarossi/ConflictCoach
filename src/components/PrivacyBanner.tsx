import { useState } from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface PrivacyBannerProps {
  /** Optional override for the lead headline. Defaults to
   * "This conversation is private to you." */
  text?: string;
  /** Name of the other party in the conflict. When supplied, the banner
   * appends "<name> will never see any of it." after the lead. */
  otherPartyName?: string;
}

const DEFAULT_LEAD = "This conversation is private to you.";
const SR_TEXT = "Private conversation. Only you and the AI coach see this.";

export function PrivacyBanner({ text, otherPartyName }: PrivacyBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const lead = text ?? DEFAULT_LEAD;

  return (
    <div
      role="region"
      aria-label="Privacy notice"
      className="flex items-start gap-2.5 px-4 py-3 bg-private-tint border-b border-border-default"
    >
      <Lock
        size={16}
        strokeWidth={1.5}
        aria-hidden="true"
        className="mt-px text-text-secondary shrink-0 lucide-lock"
      />

      <span className="sr-only">{SR_TEXT}</span>

      <p className="text-meta text-text-secondary leading-snug">
        <span className="font-medium text-text-primary">{lead}</span>
        {otherPartyName ? (
          <> {otherPartyName} will never see any of it.</>
        ) : null}{" "}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Learn more about privacy"
          className="underline hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 rounded-sm"
        >
          Learn more about privacy
        </button>
      </p>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Privacy Boundaries</DialogTitle>
            <DialogDescription>
              This content is private to you. Only you and the AI coach can see
              what is discussed here. The other party in the conflict does not
              have visibility into this conversation, your notes, or any
              coaching guidance you receive.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

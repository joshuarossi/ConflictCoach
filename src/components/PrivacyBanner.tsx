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
  text: string;
  otherPartyName?: string;
}

export function PrivacyBanner({ text, otherPartyName }: PrivacyBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div
      role="region"
      aria-label="Privacy notice"
      className="bg-private-tint flex items-center gap-2 px-4 py-2"
    >
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <button
          type="button"
          aria-label="Lock — view privacy details"
          onClick={() => setModalOpen(true)}
          className="inline-flex shrink-0 items-center justify-center rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          <Lock size={16} strokeWidth={1.5} />
        </button>

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

      <span>{text}</span>

      {otherPartyName && (
        <span className="ml-1">
          {otherPartyName} can&apos;t see this.
        </span>
      )}

      <span className="sr-only">
        Private conversation. Only you and the AI coach see this.
      </span>
    </div>
  );
}

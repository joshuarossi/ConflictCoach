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
  text?: string;
  otherPartyName?: string;
}

// eslint-disable-next-line no-empty-pattern
export function PrivacyBanner({}: PrivacyBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);

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
        className="mt-px text-text-secondary shrink-0"
      />

      <p className="text-meta text-text-secondary leading-snug">
        <span className="font-medium text-text-primary">Private to you.</span>{" "}
        Only you and the AI coach will see this.{" "}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
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

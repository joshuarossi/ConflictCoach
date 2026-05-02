/**
 * WOR-49 red-state stub: Minimal JointChatView placeholder.
 *
 * This stub exists so tests can load before the real implementation.
 * It renders nothing, so every behavioral assertion properly fails.
 *
 * REMOVE THIS FILE once src/components/JointChatView.tsx is created.
 */
import type { ReactNode } from "react";

export interface JointChatViewProps {
  currentUserId: string;
  initiatorUserId: string;
  inviteeUserId: string;
  initiatorName: string;
  inviteeName: string;
  caseName: string;
  isStreaming: boolean;
  messages: Array<{
    _id: string;
    authorType: "USER" | "COACH";
    authorUserId?: string;
    content: string;
    status: "STREAMING" | "COMPLETE" | "ERROR";
    isIntervention?: boolean;
    createdAt: number;
  }>;
  synthesisText?: string;
  onSendMessage: (content: string) => void;
  onOpenDraftCoach: () => void;
  onOpenGuidance: () => void;
  onOpenClosure: () => void;
  children?: ReactNode;
}

/**
 * Stub — renders nothing. All behavioral tests fail in red state.
 */
export function JointChatView(props: JointChatViewProps) {
  void props;
  return null;
}

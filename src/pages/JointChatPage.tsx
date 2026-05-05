import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useState, useMemo, useCallback } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ConvexErrorBoundary } from "@/components/layout/ConvexErrorBoundary";
import { ChatWindow, type ChatMessage } from "@/components/ChatWindow";
import { MessageInput } from "@/components/MessageInput";

function JointChatContent() {
  const { caseId: caseIdParam } = useParams<{ caseId: string }>();
  const caseId = caseIdParam as Id<"cases">;

  const caseData = useQuery(api.cases.get, { caseId });
  const messages = useQuery(api.jointChat.messages, { caseId });
  const sendMessage = useMutation(api.jointChat.sendUserMessage);

  const [mutationError, setMutationError] = useState<string | null>(null);

  const handleSendMessage = useCallback(
    async (content: string) => {
      setMutationError(null);
      try {
        await sendMessage({ caseId, content });
      } catch (err) {
        setMutationError(
          err instanceof Error ? err.message : "Failed to send message",
        );
      }
    },
    [sendMessage, caseId],
  );

  const chatMessages: ChatMessage[] = useMemo(
    () =>
      (messages ?? []).map(
        (m: {
          _id: string;
          authorType: string;
          authorUserId?: string;
          content: string;
          status?: string;
          createdAt: number;
        }) => ({
          _id: m._id,
          role: m.authorType === "COACH" ? ("AI" as const) : ("USER" as const),
          authorType: m.authorType,
          content: m.content,
          status: (m.status as "STREAMING" | "COMPLETE" | "ERROR") ?? "COMPLETE",
          createdAt: m.createdAt,
        }),
      ),
    [messages],
  );

  const isStreaming = useMemo(
    () => chatMessages.some((m) => m.status === "STREAMING"),
    [chatMessages],
  );

  if (caseData === undefined || messages === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (caseData === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Case not found.</p>
      </div>
    );
  }

  const isActive = caseData.status === "JOINT_ACTIVE";

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b border-gray-200 px-4 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Joint Chat</h1>
      </div>

      {mutationError && (
        <div
          role="alert"
          className="mx-4 mt-2 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700"
        >
          {mutationError}
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col overflow-hidden">
        <ChatWindow messages={chatMessages} isStreaming={isStreaming} />

        {isActive ? (
          <MessageInput
            onSend={handleSendMessage}
            isStreaming={isStreaming}
            placeholder="Type your message…"
          />
        ) : (
          <div className="flex items-center justify-center border-t border-gray-200 px-4 py-4">
            <span className="text-sm text-gray-500">
              This conversation is {caseData.status.replace("CLOSED_", "").toLowerCase()}.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function JointChatPage() {
  return (
    <ConvexErrorBoundary>
      <JointChatContent />
    </ConvexErrorBoundary>
  );
}

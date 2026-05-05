import { ConvexErrorBoundary } from "@/components/layout/ConvexErrorBoundary";
import { ConnectedJointChatView } from "@/components/JointChatView";

export function JointChatPage() {
  return (
    <ConvexErrorBoundary>
      <ConnectedJointChatView />
    </ConvexErrorBoundary>
  );
}

import { ConvexErrorBoundary } from "@/components/layout/ConvexErrorBoundary";
import { ConnectedReadyForJointView } from "@/components/ReadyForJointView";

export function ReadyForJointPage() {
  return (
    <ConvexErrorBoundary>
      <ConnectedReadyForJointView />
    </ConvexErrorBoundary>
  );
}

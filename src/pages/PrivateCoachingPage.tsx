import { ConvexErrorBoundary } from "@/components/layout/ConvexErrorBoundary";
import { ConnectedPrivateCoachingView } from "@/components/PrivateCoachingView";

export function PrivateCoachingPage() {
  return (
    <ConvexErrorBoundary>
      <ConnectedPrivateCoachingView />
    </ConvexErrorBoundary>
  );
}

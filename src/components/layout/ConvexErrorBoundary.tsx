import { Component, type ReactNode } from "react";
import { ConvexError } from "convex/values";
import { Forbidden } from "./Forbidden";

interface Props {
  children: ReactNode;
}

interface State {
  error: unknown | null;
}

/**
 * Error boundary that catches ConvexError thrown by useQuery / useMutation
 * during render and displays appropriate error UI.
 *
 * - FORBIDDEN → renders the <Forbidden /> component
 * - Other ConvexError codes → generic error message with the code
 * - Non-Convex errors → re-throws (let React's default handling apply)
 */
export class ConvexErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  render() {
    const { error } = this.state;

    if (error !== null) {
      if (error instanceof ConvexError) {
        const data = error.data as Record<string, unknown>;
        if (data.code === "FORBIDDEN") {
          return <Forbidden />;
        }
        return (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <h1 className="text-h1 font-medium text-text-primary mb-2">
              Error
            </h1>
            <p className="text-h3 text-text-secondary">
              {typeof data.message === "string"
                ? data.message
                : "An unexpected error occurred."}
            </p>
          </div>
        );
      }

      // Re-throw non-Convex errors
      throw error;
    }

    return this.props.children;
  }
}

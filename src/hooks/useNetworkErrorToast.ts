import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

/** Callback signature for showing a network error toast. */
export type ShowNetworkErrorFn = (message?: string) => void;

/**
 * Shows a transient toast notification for network errors.
 * Per DesignDoc §6.2, network errors are transient and auto-dismiss after ~5 seconds.
 *
 * Supports two usage patterns:
 * - **Reactive**: pass an Error object; a toast fires when the error transitions
 *   from null/undefined to a non-null Error.
 * - **Imperative**: call the returned function with an optional message string.
 */
export function useNetworkErrorToast(
  error?: Error | null,
): ShowNetworkErrorFn {
  const prevErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      toast.error(
        error.message || "A network error occurred. Please try again.",
        { duration: 5000 },
      );
    }
    prevErrorRef.current = error ?? null;
  }, [error]);

  const showNetworkError: ShowNetworkErrorFn = useCallback(
    (message?: string) => {
      toast.error(message ?? "A network error occurred. Please try again.", {
        duration: 5000,
      });
    },
    [],
  );

  return showNetworkError;
}

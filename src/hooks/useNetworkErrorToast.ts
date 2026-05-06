import { useCallback } from "react";
import { toast } from "sonner";

/**
 * Returns a function that shows a transient toast notification for network errors.
 * Per DesignDoc §6.2, network errors are transient and auto-dismiss after ~5 seconds.
 */
export function useNetworkErrorToast() {
  const showNetworkError = useCallback((message?: string) => {
    toast.error(message ?? "A network error occurred. Please try again.", {
      duration: 5000,
    });
  }, []);

  return showNetworkError;
}

import { useCallback } from "react";
import { toast } from "sonner";

/** Callback signature for showing a network error toast. */
export type ShowNetworkErrorFn = (message?: string) => void;

/**
 * Returns a function that shows a transient toast notification for network errors.
 * Per DesignDoc §6.2, network errors are transient and auto-dismiss after ~5 seconds.
 */
export function useNetworkErrorToast(): ShowNetworkErrorFn {
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

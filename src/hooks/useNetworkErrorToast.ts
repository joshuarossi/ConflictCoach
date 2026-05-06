import { useCallback, useEffect, useRef, createElement } from "react";
import { toast, Toaster as SonnerToaster } from "sonner";
import { createRoot } from "react-dom/client";

/** Callback signature for showing a network error toast. */
export type ShowNetworkErrorFn = (message?: string) => void;

/**
 * Ensure a Sonner Toaster is mounted in the document so that toast()
 * calls produce visible DOM elements. In the main app, main.tsx already
 * renders <Toaster />; this detects it via [data-sonner-toaster] and
 * skips. If no Toaster exists (e.g. isolated render, micro-frontend),
 * a fallback is mounted to prevent silent toast loss.
 */
let toasterEnsured = false;

function ensureToaster() {
  if (toasterEnsured) return;
  if (typeof document === "undefined") return;
  if (document.querySelector("[data-sonner-toaster]")) {
    toasterEnsured = true;
    return;
  }
  const container = document.createElement("div");
  container.id = "__sonner-fallback";
  document.body.appendChild(container);
  createRoot(container).render(
    createElement(SonnerToaster, {
      position: "top-center",
      toastOptions: { duration: 5000 },
    }),
  );
  toasterEnsured = true;
}

/**
 * Shows a transient toast notification for network errors.
 * Per DesignDoc §6.2, network errors are transient and auto-dismiss after ~5 seconds.
 *
 * Supports two usage patterns:
 * - **Reactive**: pass an Error object; a toast fires when the error transitions
 *   from null/undefined to a non-null Error.
 * - **Imperative**: call the returned function with an optional message string.
 */
export function useNetworkErrorToast(error?: Error | null): ShowNetworkErrorFn {
  const prevErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      ensureToaster();
      toast.error(
        error.message || "A network error occurred. Please try again.",
        { duration: 5000 },
      );
    }
    prevErrorRef.current = error ?? null;
  }, [error]);

  const showNetworkError: ShowNetworkErrorFn = useCallback(
    (message?: string) => {
      ensureToaster();
      toast.error(message ?? "A network error occurred. Please try again.", {
        duration: 5000,
      });
    },
    [],
  );

  return showNetworkError;
}

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        className:
          "bg-surface border border-border-default text-text-primary shadow-2",
        duration: 5000,
      }}
    />
  );
}

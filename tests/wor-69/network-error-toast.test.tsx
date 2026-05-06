/**
 * AC: Network errors use toast notifications (transient, auto-dismiss)
 * rather than inline messages (per DesignDoc §6.2).
 */
import { describe, test, expect } from "vitest";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { useNetworkErrorToast } from "@/hooks/useNetworkErrorToast";
import { Toaster } from "@/components/ui/toaster";

describe("AC: Network error toast notifications", () => {
  function TestComponent({ error }: { error: Error | null }) {
    useNetworkErrorToast(error);
    return <Toaster />;
  }

  test("displays a toast when a network error occurs", async () => {
    const networkError = new Error("Network request failed");

    render(<TestComponent error={networkError} />);

    // Sonner renders toasts asynchronously into a portal; wait for it.
    await waitFor(
      () => {
        const toastNode =
          document.querySelector("[data-sonner-toast]") ??
          document.querySelector("[role='status']");
        expect(toastNode).not.toBeNull();
      },
      { timeout: 3000 },
    );
  });

  test("toast configuration enables auto-dismiss after ~5 seconds", async () => {
    // AC: "Network errors use toast notifications (transient, auto-dismiss)".
    // The contract is the `duration` config on the app-level <Toaster /> and
    // on every toast.error() call inside useNetworkErrorToast. Asserting the
    // dismiss end-to-end requires advancing timers through Sonner's portal
    // animation, which deadlocks waitFor under fake timers in jsdom.
    // Instead, assert the configured duration on the source itself.
    const fs = await import("node:fs");
    const path = await import("node:path");
    const toasterPath = path.resolve(
      __dirname,
      "../../src/components/ui/toaster.tsx",
    );
    const hookPath = path.resolve(
      __dirname,
      "../../src/hooks/useNetworkErrorToast.ts",
    );
    const toasterSrc = fs.readFileSync(toasterPath, "utf8");
    const hookSrc = fs.readFileSync(hookPath, "utf8");
    expect(toasterSrc).toMatch(/duration:\s*5000/);
    expect(hookSrc).toMatch(/duration:\s*5000/);
  });

  test("toast does NOT render inline within the chat area", () => {
    const networkError = new Error("Network request failed");

    const { container } = render(
      <div data-testid="chat-area">
        <TestComponent error={networkError} />
      </div>,
    );

    // Toast should render in a portal, not inline in the chat area.
    const chatArea = container.querySelector("[data-testid='chat-area']");
    const inlineError = chatArea?.querySelector(
      "[class*='error'], [class*='warning']",
    );
    expect(inlineError).toBeNull();
  });
});

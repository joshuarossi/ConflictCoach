import { useEffect, useRef } from "react";

/**
 * Moves focus to the primary heading (h1 or h2) when the case phase changes.
 * This ensures screen-reader users are oriented after a phase transition.
 *
 * @param phase - The current case phase/status string
 */
export function usePhaseChangeFocus(phase: string | undefined) {
  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    if (!phase || phase === prevPhaseRef.current) return;
    prevPhaseRef.current = phase;

    requestAnimationFrame(() => {
      const heading = document.querySelector("h1, h2");
      if (heading instanceof HTMLElement) {
        if (!heading.hasAttribute("tabindex")) {
          heading.setAttribute("tabindex", "-1");
        }
        heading.focus({ preventScroll: false });
      }
    });
  }, [phase]);
}

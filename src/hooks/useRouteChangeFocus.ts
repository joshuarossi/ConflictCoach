import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Moves focus to the page's <h1> element after each route change.
 * This ensures screen-reader users are oriented after navigation.
 *
 * Call once in a layout component that wraps all routed content.
 */
export function useRouteChangeFocus() {
  const { pathname } = useLocation();
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;

    // Allow the new route to render before moving focus.
    requestAnimationFrame(() => {
      const h1 = document.querySelector("h1");
      if (h1 instanceof HTMLElement) {
        // Make h1 programmatically focusable if it isn't already.
        if (!h1.hasAttribute("tabindex")) {
          h1.setAttribute("tabindex", "-1");
        }
        h1.focus({ preventScroll: false });
      }
    });
  }, [pathname]);
}

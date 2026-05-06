import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

if (
  typeof Element !== "undefined" &&
  !("scrollIntoView" in Element.prototype)
) {
  (
    Element.prototype as unknown as { scrollIntoView: () => void }
  ).scrollIntoView = vi.fn();
}

if (
  typeof globalThis.navigator !== "undefined" &&
  !globalThis.navigator.clipboard
) {
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: { writeText: vi.fn(async () => {}) },
    configurable: true,
  });
}

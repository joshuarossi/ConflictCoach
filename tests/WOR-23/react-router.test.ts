import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

describe("AC: React Router v6 is configured with a placeholder route at /", () => {
  test("Navigating to / renders a placeholder component", async () => {
    // Import the app's router/routes configuration
    // The app should export a component that uses React Router
    const { default: App } = await import("@/App");

    const { container } = render(
      createElement(MemoryRouter, { initialEntries: ["/"] }, createElement(App))
    );

    // The placeholder route at / should render something visible
    // (not a blank page or a 404-like state)
    expect(container.innerHTML).not.toBe("");
    // There should be meaningful content rendered — not just empty wrappers
    expect(container.textContent?.trim().length).toBeGreaterThan(0);
  });

  test("react-router-dom is installed", () => {
    // This import would fail if react-router-dom is not installed
    expect(() => require("react-router-dom")).not.toThrow();
    const rr = require("react-router-dom");
    expect(rr.BrowserRouter).toBeDefined();
    expect(rr.Routes).toBeDefined();
    expect(rr.Route).toBeDefined();
  });
});

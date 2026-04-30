import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";

describe("AC: React Router v6 is configured with a placeholder route at /", () => {
  test("the app renders content at the / route", async () => {
    // Import the app's router or root component
    // The dev agent should export routes or an App component
    const { default: App } = await import("@/App");

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(App)
      )
    );

    // The placeholder route should render something visible
    // We check for any meaningful content (not a blank page)
    const root = screen.getByRole("main") || document.body.firstChild;
    expect(root || document.body.innerHTML.length).toBeTruthy();

    // The body should not be empty — the placeholder route must render content
    expect(document.body.innerHTML).not.toBe("");
  });

  test("react-router-dom is installed and provides routing primitives", async () => {
    const routerDom = await import("react-router-dom");
    expect(routerDom.BrowserRouter).toBeDefined();
    expect(routerDom.Routes).toBeDefined();
    expect(routerDom.Route).toBeDefined();
    expect(routerDom.useNavigate).toBeDefined();
  });
});

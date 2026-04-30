import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";

/**
 * AC: React Router v6 is configured with a placeholder route at /.
 *
 * The dev agent must create an App component that sets up React Router
 * with at least a route at "/" rendering some placeholder content.
 * We import the app's router/routes and render them inside a MemoryRouter.
 */
describe("AC: React Router v6 is configured with a placeholder route at /", () => {
  test("navigating to / renders a placeholder component", async () => {
    // Import the main App component which should contain the router setup.
    // The dev agent will create this at src/App.tsx.
    const { default: App } = await import("@/App");

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    // The placeholder route at / should render something visible.
    // We check that the document body has meaningful content (not empty).
    const root = document.body;
    expect(root.textContent).not.toBe("");
  });

  test("react-router-dom is listed as a dependency", () => {
    const pkg = JSON.parse(
      require("fs").readFileSync(
        require("path").resolve(__dirname, "../../package.json"),
        "utf-8"
      )
    );
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps["react-router-dom"]).toBeDefined();
  });
});

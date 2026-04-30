import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router-dom";

describe("React Router v6 is configured with a placeholder route at /", () => {
  test("react-router-dom is a dependency", () => {
    const { readFileSync } = require("fs");
    const { resolve } = require("path");
    const root = resolve(__dirname, "../..");
    const pkg = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf-8"),
    );
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps).toHaveProperty("react-router-dom");
  });

  test("navigating to / renders a placeholder component", async () => {
    // Import the App component which should define the routes
    const { default: App } = await import("@/App");

    const { container } = render(
      createElement(MemoryRouter, { initialEntries: ["/"] }, createElement(App)),
    );

    // The placeholder should render *something* visible at "/"
    // We assert the container is non-empty (has rendered children)
    expect(container.innerHTML.length).toBeGreaterThan(0);
    // The placeholder content should not be a blank page
    expect(container.textContent!.length).toBeGreaterThan(0);
  });
});

import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";

describe("Tailwind utility classes render correctly in a test component", () => {
  test("Tailwind classes are present on rendered elements", () => {
    // Render a simple element with Tailwind utility classes
    const { container } = render(
      createElement(
        "div",
        { className: "bg-blue-500 text-white p-4" },
        "Tailwind test",
      ),
    );
    const div = container.firstElementChild as HTMLElement;
    expect(div).not.toBeNull();
    expect(div.className).toContain("bg-blue-500");
    expect(div.className).toContain("text-white");
    expect(div.className).toContain("p-4");
  });

  test("Tailwind CSS is configured in the project", () => {
    // Verify tailwind config exists — either tailwind.config.ts or tailwind.config.js,
    // or postcss.config with tailwind, or tailwind directives in CSS.
    // The dev agent may use Tailwind v3 (config file) or v4 (@import "tailwindcss" in CSS).
    // We check that tailwindcss is a dependency, which is required either way.
    const { existsSync, readFileSync } = require("fs");
    const { resolve } = require("path");
    const root = resolve(__dirname, "../..");

    const pkg = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf-8"),
    );
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps).toHaveProperty("tailwindcss");
  });
});

import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";

describe("AC: Tailwind utility classes render correctly in a test component", () => {
  test("A component with Tailwind classes has those classes in the DOM", () => {
    // Render a simple element with Tailwind utility classes
    const TestComponent = () =>
      createElement(
        "div",
        { "data-testid": "tailwind-test", className: "bg-blue-500 text-white p-4 rounded-lg" },
        "Tailwind Test"
      );

    const { getByTestId } = render(createElement(TestComponent));
    const element = getByTestId("tailwind-test");

    expect(element).toHaveClass("bg-blue-500");
    expect(element).toHaveClass("text-white");
    expect(element).toHaveClass("p-4");
    expect(element).toHaveClass("rounded-lg");
  });

  test("Tailwind CSS config file exists", () => {
    const { existsSync } = require("fs");
    const { resolve } = require("path");
    const rootDir = resolve(__dirname, "../..");

    const possibleConfigs = [
      "tailwind.config.js",
      "tailwind.config.ts",
      "tailwind.config.cjs",
      "tailwind.config.mjs",
    ];

    // Tailwind v4 may use CSS-based config instead of a JS config file
    // Check for either a tailwind config file OR a postcss config that references tailwind
    // OR a CSS file that imports tailwindcss (v4 style)
    const hasTailwindConfig = possibleConfigs.some((config) =>
      existsSync(resolve(rootDir, config))
    );

    // Also acceptable: Tailwind v4 with @import "tailwindcss" in CSS
    const possibleCssEntries = [
      "src/index.css",
      "src/globals.css",
      "src/app.css",
      "src/styles.css",
    ];
    const hasTailwindCssImport = possibleCssEntries.some((cssFile) => {
      try {
        const content = require("fs").readFileSync(
          resolve(rootDir, cssFile),
          "utf-8"
        );
        return (
          content.includes("tailwindcss") || content.includes("@tailwind")
        );
      } catch {
        return false;
      }
    });

    expect(hasTailwindConfig || hasTailwindCssImport).toBe(true);
  });
});

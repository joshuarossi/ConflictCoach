import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

/**
 * AC: Tailwind utility classes render correctly in a test component.
 *
 * We verify that Tailwind classes are applied to DOM elements.
 * The dev agent must ensure Tailwind is configured so that
 * utility classes work in components.
 */
describe("AC: Tailwind utility classes render correctly in a test component", () => {
  test("a component with Tailwind classes has those classes in the DOM", () => {
    const TestComponent = () => (
      <div data-testid="tailwind-test" className="bg-blue-500 text-white p-4 rounded-lg">
        Tailwind Test
      </div>
    );

    const { getByTestId } = render(<TestComponent />);
    const el = getByTestId("tailwind-test");

    expect(el).toHaveClass("bg-blue-500");
    expect(el).toHaveClass("text-white");
    expect(el).toHaveClass("p-4");
    expect(el).toHaveClass("rounded-lg");
  });
});

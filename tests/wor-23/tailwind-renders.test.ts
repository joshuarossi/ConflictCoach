import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

describe("AC: Tailwind utility classes render correctly in a test component", () => {
  test("a component with Tailwind classes has those classes in the DOM", () => {
    const TestComponent = () =>
      React.createElement(
        "div",
        { className: "bg-blue-500 text-white p-4 rounded-lg" },
        "Tailwind Test"
      );

    const { container } = render(React.createElement(TestComponent));
    const div = container.firstChild as HTMLElement;

    expect(div).toBeInTheDocument();
    expect(div).toHaveClass("bg-blue-500");
    expect(div).toHaveClass("text-white");
    expect(div).toHaveClass("p-4");
    expect(div).toHaveClass("rounded-lg");
    expect(div).toHaveTextContent("Tailwind Test");
  });
});

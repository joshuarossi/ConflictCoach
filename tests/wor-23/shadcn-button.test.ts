import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

describe("AC: At least one shadcn/ui primitive (Button) is installed and importable", () => {
  test("Button component can be imported from @/components/ui/button", async () => {
    // This import will fail until the dev agent creates the Button component
    const { Button } = await import("@/components/ui/button");
    expect(Button).toBeDefined();
  });

  test("Button component renders as a clickable button element", async () => {
    const { Button } = await import("@/components/ui/button");
    render(React.createElement(Button, null, "Click me"));

    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe("BUTTON");
  });
});

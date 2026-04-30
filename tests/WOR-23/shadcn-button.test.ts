import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import { createElement } from "react";

describe("AC: At least one shadcn/ui primitive (Button) is installed and importable", () => {
  test("Button component can be imported from @/components/ui/button", async () => {
    // Dynamic import to get a clear error if the module doesn't exist
    const { Button } = await import("@/components/ui/button");
    expect(Button).toBeDefined();
    expect(typeof Button).toBe("function");
  });

  test("Button component renders without error", async () => {
    const { Button } = await import("@/components/ui/button");

    const { getByRole } = render(
      createElement(Button, null, "Click me")
    );

    const button = getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Click me");
  });
});

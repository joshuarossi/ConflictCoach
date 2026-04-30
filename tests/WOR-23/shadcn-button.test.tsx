import { describe, test, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

/**
 * AC: At least one shadcn/ui primitive (Button) is installed and importable.
 *
 * This test imports Button from the expected shadcn/ui location.
 * If the component doesn't exist, the import will fail — that's the
 * desired "red" state. The dev agent must install shadcn/ui and
 * add the Button component.
 */
describe("AC: At least one shadcn/ui primitive (Button) is installed and importable", () => {
  test("Button component from @/components/ui/button renders without error", async () => {
    // Dynamic import so the test file itself compiles even if the module
    // doesn't exist yet. The test will fail at runtime with a clear message.
    const { Button } = await import("@/components/ui/button");

    const { getByRole } = render(<Button>Click me</Button>);
    const button = getByRole("button");

    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Click me");
  });
});

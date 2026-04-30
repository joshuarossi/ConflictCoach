import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createElement } from "react";

describe("At least one shadcn/ui primitive (Button) is installed and importable", () => {
  test("Button component can be imported from @/components/ui/button", async () => {
    // Dynamic import so we get a clear "module not found" error if it doesn't exist
    const mod = await import("@/components/ui/button");
    expect(mod.Button).toBeDefined();
  });

  test("Button component renders without error", async () => {
    const { Button } = await import("@/components/ui/button");
    const { container } = render(createElement(Button, null, "Click me"));
    const button = container.querySelector("button");
    expect(button).not.toBeNull();
    expect(button!.textContent).toBe("Click me");
  });
});

import { describe, test, expect } from "vitest";

describe("AC: At least one shadcn/ui primitive (Button) is installed and importable", () => {
  test("Button component can be imported from @/components/ui/button", async () => {
    // This import will fail until shadcn/ui Button is installed at the expected path.
    const module = await import("@/components/ui/button");
    expect(module.Button).toBeDefined();
    expect(typeof module.Button).toBe("function");
  });

  test("Button renders without error", async () => {
    const { createElement } = await import("react");
    const { render } = await import("@testing-library/react");
    const { Button } = await import("@/components/ui/button");

    const { getByRole } = render(
      createElement(Button, null, "Click me")
    );

    const button = getByRole("button", { name: "Click me" });
    expect(button).toBeDefined();
  });
});

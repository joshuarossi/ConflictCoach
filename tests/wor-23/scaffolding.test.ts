import { describe, test, expect } from "vitest";

describe("Scaffolding: Vitest is wired correctly", () => {
  test("vitest test environment is functional", () => {
    // Proves Vitest is properly configured and can run tests
    expect(typeof describe).toBe("function");
    expect(typeof test).toBe("function");
    expect(typeof expect).toBe("function");
  });
});

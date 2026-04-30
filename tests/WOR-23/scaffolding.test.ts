import { describe, test, expect } from "vitest";

describe("Scaffolding: Vitest is wired correctly", () => {
  test("Vitest runs and basic assertions work", () => {
    expect(1 + 1).toBe(2);
  });

  test("jsdom environment is available", () => {
    expect(typeof document).toBe("object");
    expect(typeof window).toBe("object");
  });
});

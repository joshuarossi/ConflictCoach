import { describe, test, expect } from "vitest";

/**
 * AC: Tailwind config extends theme with custom colors mapped to CSS vars
 * (e.g., bg-canvas, text-primary, accent)
 *
 * This test imports the tailwind config and verifies that custom color keys
 * are mapped to var(--...) values, making them available as Tailwind utilities.
 */
describe("AC: Tailwind config extends theme with custom colors mapped to CSS vars", () => {
  test("tailwind config exports theme color extensions mapped to CSS custom properties", async () => {
    // Import the tailwind config — this will fail until the config is extended
    const config = await import("../../tailwind.config.ts");
    const resolved = config.default;

    expect(resolved).toBeDefined();
    expect(resolved.theme).toBeDefined();

    const colors =
      (resolved.theme as Record<string, any>)?.extend?.colors ??
      (resolved.theme as Record<string, any>)?.colors;

    expect(colors, "Tailwind config must define custom colors").toBeDefined();

    // Required color utility keys that should map to CSS vars
    const requiredColorKeys = [
      "canvas",
      "surface",
      "primary",
      "accent",
      "danger",
      "warning",
      "coach-accent",
      "private-tint",
    ];

    for (const key of requiredColorKeys) {
      // Support nested structures like { bg: { canvas: ... } } or flat { canvas: ... }
      const found = findColorKey(colors, key);
      expect(found, `Missing Tailwind color key: ${key}`).toBeTruthy();
    }
  });

  test("color values reference CSS custom properties via var()", async () => {
    const config = await import("../../tailwind.config.ts");
    const colors =
      (config.default.theme as Record<string, any>)?.extend?.colors ??
      (config.default.theme as Record<string, any>)?.colors;

    // Collect all leaf values from the colors object
    const values = collectLeafValues(colors);

    // At least some values should use var(--...) pattern
    const varValues = values.filter(
      (v) => typeof v === "string" && v.includes("var(--"),
    );
    expect(
      varValues.length,
      "Tailwind color values must use var(--...) CSS custom properties",
    ).toBeGreaterThan(0);
  });
});

function findColorKey(obj: Record<string, unknown>, key: string): boolean {
  if (!obj) return false;
  if (key in obj) return true;
  for (const val of Object.values(obj)) {
    if (typeof val === "object" && val !== null) {
      if (findColorKey(val as Record<string, unknown>, key)) return true;
    }
  }
  return false;
}

function collectLeafValues(obj: unknown): unknown[] {
  if (typeof obj !== "object" || obj === null) return [obj];
  return Object.values(obj).flatMap(collectLeafValues);
}

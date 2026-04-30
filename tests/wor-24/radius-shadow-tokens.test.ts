import { describe, test, expect } from "vitest";

/**
 * AC: Radius tokens (sm/md/lg/xl/full) and shadow tokens (shadow-0 through shadow-3)
 * are available as Tailwind utilities
 */
describe("AC: Radius tokens (sm/md/lg/xl/full) and shadow tokens (shadow-0 through shadow-3) are available as Tailwind utilities", () => {
  test("Tailwind config defines borderRadius entries for sm, md, lg, xl, full", async () => {
    const config = await import("../../tailwind.config.ts");
    const borderRadius =
      (config.default.theme as Record<string, any>)?.extend?.borderRadius ?? (config.default.theme as Record<string, any>)?.borderRadius;

    expect(borderRadius, "Tailwind config must define custom borderRadius").toBeDefined();

    const requiredRadii = ["sm", "md", "lg", "xl", "full"];
    for (const key of requiredRadii) {
      expect(
        borderRadius,
        `Missing borderRadius entry: "${key}"`,
      ).toHaveProperty(key);
    }
  });

  test("borderRadius values match StyleGuide §4.2 (sm=6px, md=10px, lg=14px, xl=20px, full=9999px)", async () => {
    const config = await import("../../tailwind.config.ts");
    const borderRadius =
      (config.default.theme as Record<string, any>)?.extend?.borderRadius ?? (config.default.theme as Record<string, any>)?.borderRadius;

    expect(borderRadius?.sm).toContain("6");
    expect(borderRadius?.md).toContain("10");
    expect(borderRadius?.lg).toContain("14");
    expect(borderRadius?.xl).toContain("20");
    expect(borderRadius?.full).toContain("9999");
  });

  test("Tailwind config defines boxShadow entries for 0, 1, 2, 3", async () => {
    const config = await import("../../tailwind.config.ts");
    const boxShadow =
      (config.default.theme as Record<string, any>)?.extend?.boxShadow ?? (config.default.theme as Record<string, any>)?.boxShadow;

    expect(boxShadow, "Tailwind config must define custom boxShadow").toBeDefined();

    // Shadow tokens may be keyed as "0"/"1"/"2"/"3" or "shadow-0" etc.
    const keys = Object.keys(boxShadow!);
    const hasAllShadows = [0, 1, 2, 3].every(
      (n) => keys.includes(String(n)) || keys.includes(`shadow-${n}`),
    );

    expect(
      hasAllShadows,
      `boxShadow must include entries for 0, 1, 2, 3. Found: ${keys.join(", ")}`,
    ).toBe(true);
  });

  test("shadow-0 is 'none' (flat/borders only)", async () => {
    const config = await import("../../tailwind.config.ts");
    const boxShadow =
      (config.default.theme as Record<string, any>)?.extend?.boxShadow ?? (config.default.theme as Record<string, any>)?.boxShadow;

    const shadow0 = boxShadow?.["0"] ?? boxShadow?.["shadow-0"];
    expect(shadow0).toBe("none");
  });
});

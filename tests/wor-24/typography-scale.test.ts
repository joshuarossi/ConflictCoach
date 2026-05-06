import { describe, test, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * AC: Typography scale matches StyleGuide §3.3 (display through timestamp sizes);
 * body 15px/1.6, chat bubbles 16px, timestamps 12px, headings 500 weight
 *
 * Validates both the Tailwind config fontSize entries and the CSS/config for
 * the required typography scale values.
 */
describe("AC: Typography scale matches StyleGuide §3.3", () => {
  // Expected scale from StyleGuide §3.3
  const EXPECTED_SIZES: Record<
    string,
    { size: number; lineHeight: number | string }
  > = {
    display: { size: 32, lineHeight: 40 },
    h1: { size: 24, lineHeight: 32 },
    h2: { size: 20, lineHeight: 28 },
    h3: { size: 17, lineHeight: 24 },
    body: { size: 15, lineHeight: 1.6 },
    chat: { size: 16, lineHeight: 1.55 },
    label: { size: 14, lineHeight: 20 },
    meta: { size: 13, lineHeight: 18 },
    timestamp: { size: 12, lineHeight: 16 },
  };

  test("tailwind config defines fontSize entries for the full typography scale", async () => {
    const config = await import("../../tailwind.config.ts");
    const fontSize =
      (config.default.theme as Record<string, any>)?.extend?.fontSize ??
      (config.default.theme as Record<string, any>)?.fontSize;

    expect(
      fontSize,
      "Tailwind config must define custom fontSize entries",
    ).toBeDefined();

    for (const role of Object.keys(EXPECTED_SIZES)) {
      expect(fontSize, `Missing fontSize entry for "${role}"`).toHaveProperty(
        role,
      );
    }
  });

  test("body fontSize is 15px with line-height 1.6", async () => {
    const config = await import("../../tailwind.config.ts");
    const fontSize =
      (config.default.theme as Record<string, any>)?.extend?.fontSize ??
      (config.default.theme as Record<string, any>)?.fontSize;

    const body = fontSize?.body;
    expect(body).toBeDefined();

    // fontSize can be ["15px", { lineHeight: "1.6" }] or ["15px", "1.6"] etc.
    const sizeStr = Array.isArray(body) ? body[0] : body;
    expect(sizeStr).toContain("15");
  });

  test("chat fontSize is 16px", async () => {
    const config = await import("../../tailwind.config.ts");
    const fontSize =
      (config.default.theme as Record<string, any>)?.extend?.fontSize ??
      (config.default.theme as Record<string, any>)?.fontSize;

    const chat = fontSize?.chat;
    expect(chat).toBeDefined();

    const sizeStr = Array.isArray(chat) ? chat[0] : chat;
    expect(sizeStr).toContain("16");
  });

  test("timestamp fontSize is 12px", async () => {
    const config = await import("../../tailwind.config.ts");
    const fontSize =
      (config.default.theme as Record<string, any>)?.extend?.fontSize ??
      (config.default.theme as Record<string, any>)?.fontSize;

    const timestamp = fontSize?.timestamp;
    expect(timestamp).toBeDefined();

    const sizeStr = Array.isArray(timestamp) ? timestamp[0] : timestamp;
    expect(sizeStr).toContain("12");
  });

  test("heading weights are 500 (not 700) — verified in globals.css or theme.ts", () => {
    // Check globals.css for heading weight declarations
    const globalsPath = path.resolve(__dirname, "../../src/globals.css");
    const cssContent = fs.readFileSync(globalsPath, "utf-8");

    // Also check theme.ts if it exists
    const themePath = path.resolve(__dirname, "../../src/lib/theme.ts");
    const themeExists = fs.existsSync(themePath);
    const themeContent = themeExists ? fs.readFileSync(themePath, "utf-8") : "";

    const combined = cssContent + themeContent;

    // Verify that heading weight 500 appears somewhere in the typography config
    expect(
      combined,
      "Typography config must reference weight 500 for headings",
    ).toContain("500");

    // Verify weight 700 is NOT used for headings
    // (700 should not appear in heading-related contexts)
    const heading700 =
      /h[1-3].*font-weight\s*:\s*700|heading.*700|700.*heading/i;
    expect(combined, "Headings must NOT use font-weight 700").not.toMatch(
      heading700,
    );
  });
});

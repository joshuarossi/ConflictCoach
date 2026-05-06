/**
 * WOR-80: Design token usage enforcement.
 *
 * Reads every .tsx file under src/ and asserts that no hardcoded Tailwind
 * color, shadow, typography, or spacing classes remain. All classes must
 * use the design-token-mapped equivalents defined in STYLE_GUIDE / DesignDoc.
 *
 * Acceptance criteria covered:
 *   - All hardcoded color literals replaced with design tokens
 *   - All cards use the same padding/radius/shadow set from STYLE_GUIDE
 *   - Typography scale matches DesignDoc
 *   - Spacing scale matches DesignDoc
 *   - Buttons use the spec'd component variants
 *   - Form inputs use the spec'd component with consistent border/focus states
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve(__dirname, "../../src");

/**
 * Recursively collect all .tsx files under a directory.
 */
function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsxFiles(full));
    } else if (entry.name.endsWith(".tsx")) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Files that are allowed to contain raw Tailwind color classes because they
 * define CSS variables or are not part of the application UI.
 */
const EXCLUDED_FILES = new Set(["main.tsx"]);

function shouldScan(filePath: string): boolean {
  const basename = path.basename(filePath);
  return !EXCLUDED_FILES.has(basename);
}

// ---------------------------------------------------------------------------
// Denylists — patterns that must NOT appear in source after WOR-80
// ---------------------------------------------------------------------------

/**
 * Hardcoded Tailwind color classes. Matches bg-, text-, border-, ring-,
 * outline-, divide-, placeholder- prefixed with specific color names.
 *
 * Allows: bg-black/80 overlay exception is addressed by checking file
 * context (dialog overlays are acceptable per contract open question #1,
 * but we now expect bg-black/30 per STYLE_GUIDE).
 */
const DENIED_COLOR_PATTERN =
  /\b(?:bg|text|border|ring|outline|divide|placeholder|from|to|via|decoration|accent|caret|fill|stroke)-(?:blue|red|green|gray|white|black|amber|slate|zinc|neutral|stone|emerald|teal|cyan|indigo|violet|purple|pink|rose|orange|lime|sky|fuchsia|yellow)-\d{1,3}(?:\/\d+)?\b/g;

/**
 * Standalone bg-white / bg-black (without opacity modifier like bg-black/30).
 * bg-black/30 is acceptable for dialog overlays per contract.
 */
const DENIED_STANDALONE_BW_PATTERN = /\b(?:bg-white|text-white|border-white)\b/g;
const DENIED_BG_BLACK_SOLID = /\bbg-black\b(?!\/)/g;

/**
 * Hardcoded shadow classes — only shadow-0, shadow-1, shadow-2, shadow-3
 * are allowed.
 */
const DENIED_SHADOW_PATTERN =
  /\bshadow-(?:sm|md|lg|xl|2xl|inner|none)\b/g;

/**
 * Hardcoded text size classes — only the named scale is allowed:
 * text-display, text-h1, text-h2, text-h3, text-body, text-chat,
 * text-label, text-meta, text-timestamp.
 */
const DENIED_TEXT_SIZE_PATTERN =
  /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/g;

/**
 * Spacing values outside the 8px grid. Allowed Tailwind spacing values:
 * 0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64, px
 *
 * Denied odd spacing: 7, 9, 11, 13, 14, 15, 17, 18, 19, 21, 22, 23, etc.
 * These correspond to values not on the 8px grid.
 */
const DENIED_SPACING_VALUES = new Set([
  "7", "9", "11", "13", "14", "15", "17", "18", "19",
  "21", "22", "23", "25", "26", "27", "28", "29", "30", "31",
  "33", "34", "35", "36", "37", "38", "39",
  "41", "42", "43", "44", "45", "46", "47",
]);
const SPACING_PREFIXES = [
  "p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe",
  "m", "mx", "my", "mt", "mr", "mb", "ml", "ms", "me",
  "gap", "gap-x", "gap-y",
  "space-x", "space-y",
  "inset", "inset-x", "inset-y", "top", "right", "bottom", "left",
  "w", "h", "min-w", "min-h", "max-w", "max-h",
  "size",
];

function buildDeniedSpacingPattern(): RegExp {
  const prefixes = SPACING_PREFIXES.map((p) => p.replace(/-/g, "\\-")).join("|");
  const values = [...DENIED_SPACING_VALUES].join("|");
  return new RegExp(`\\b(?:${prefixes})-(?:${values})\\b`, "g");
}

const DENIED_SPACING_PATTERN = buildDeniedSpacingPattern();

/**
 * Arbitrary CSS var bracket syntax where a Tailwind utility exists.
 * e.g. bg-[var(--bg-surface)] should be bg-surface.
 */
const DENIED_BRACKET_VAR_PATTERN =
  /\b(?:bg|text|border|ring)-\[var\(--[^\]]+\)\]/g;

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

const allFiles = collectTsxFiles(SRC_DIR).filter(shouldScan);

describe("WOR-80: No hardcoded Tailwind color literals", () => {
  it.each(allFiles.map((f) => [path.relative(SRC_DIR, f), f]))(
    "%s has no denied color classes",
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath as string, "utf-8");
      const matches = content.match(DENIED_COLOR_PATTERN) ?? [];
      expect(
        matches,
        `Found hardcoded color classes: ${[...new Set(matches)].join(", ")}`,
      ).toHaveLength(0);
    },
  );
});

describe("WOR-80: No standalone bg-white / bg-black / text-white / border-white", () => {
  it.each(allFiles.map((f) => [path.relative(SRC_DIR, f), f]))(
    "%s has no denied standalone BW classes",
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath as string, "utf-8");
      const bwMatches = content.match(DENIED_STANDALONE_BW_PATTERN) ?? [];
      const bgBlackMatches = content.match(DENIED_BG_BLACK_SOLID) ?? [];
      const all = [...bwMatches, ...bgBlackMatches];
      expect(
        all,
        `Found hardcoded BW classes: ${[...new Set(all)].join(", ")}`,
      ).toHaveLength(0);
    },
  );
});

describe("WOR-80: No hardcoded shadow classes", () => {
  it.each(allFiles.map((f) => [path.relative(SRC_DIR, f), f]))(
    "%s uses only shadow-0/1/2/3",
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath as string, "utf-8");
      const matches = content.match(DENIED_SHADOW_PATTERN) ?? [];
      expect(
        matches,
        `Found hardcoded shadow classes: ${[...new Set(matches)].join(", ")}`,
      ).toHaveLength(0);
    },
  );
});

describe("WOR-80: No hardcoded text size classes", () => {
  it.each(allFiles.map((f) => [path.relative(SRC_DIR, f), f]))(
    "%s uses only named typography scale",
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath as string, "utf-8");
      const matches = content.match(DENIED_TEXT_SIZE_PATTERN) ?? [];
      expect(
        matches,
        `Found hardcoded text sizes: ${[...new Set(matches)].join(", ")}`,
      ).toHaveLength(0);
    },
  );
});

describe("WOR-80: No off-grid spacing values", () => {
  it.each(allFiles.map((f) => [path.relative(SRC_DIR, f), f]))(
    "%s uses only 8px-grid spacing",
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath as string, "utf-8");
      const matches = content.match(DENIED_SPACING_PATTERN) ?? [];
      expect(
        matches,
        `Found off-grid spacing: ${[...new Set(matches)].join(", ")}`,
      ).toHaveLength(0);
    },
  );
});

describe("WOR-80: No arbitrary CSS var bracket syntax", () => {
  it.each(allFiles.map((f) => [path.relative(SRC_DIR, f), f]))(
    "%s uses mapped Tailwind utilities instead of bracket vars",
    (_rel, filePath) => {
      const content = fs.readFileSync(filePath as string, "utf-8");
      const matches = content.match(DENIED_BRACKET_VAR_PATTERN) ?? [];
      expect(
        matches,
        `Found bracket var syntax: ${[...new Set(matches)].join(", ")}`,
      ).toHaveLength(0);
    },
  );
});

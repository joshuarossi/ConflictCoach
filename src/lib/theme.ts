/**
 * Conflict Coach — Design Tokens (programmatic access)
 *
 * Use these constants when JS/TS needs raw token values — e.g. SVG fills,
 * canvas drawing, or computed style comparisons. For CSS, always prefer
 * var(--token-name) or the Tailwind utility class.
 */

// ---------------------------------------------------------------------------
// Colors (light defaults — runtime values come from CSS vars)
// ---------------------------------------------------------------------------

export const colors = {
  bgCanvas: "#FAF8F5",
  bgSurface: "#FFFFFF",
  bgSurfaceSubtle: "#F3EFE9",
  textPrimary: "#1F1D1A",
  textSecondary: "#5C5952",
  textTertiary: "#8A8680",
  borderDefault: "#E5E0D8",
  borderStrong: "#CBC4B8",
  accent: "#6B8E7F",
  accentHover: "#5A7A6C",
  accentSubtle: "#DCE7E0",
  accentOn: "#FFFFFF",
  coachAccent: "#8B7AB5",
  coachSubtle: "#EAE4F2",
  partyInitiator: "#6B85A8",
  partyInitiatorSubtle: "#DFE5EF",
  partyInvitee: "#B07A8F",
  partyInviteeSubtle: "#EFE0E4",
  danger: "#B5594D",
  dangerSubtle: "#F2DCD8",
  warning: "#B58B4D",
  warningSubtle: "#F2E5D4",
  success: "#6B8E7F",
  privateTint: "#F0E9E0",
} as const;

export const colorsDark = {
  bgCanvas: "#1A1816",
  bgSurface: "#242220",
  bgSurfaceSubtle: "#2E2B28",
  textPrimary: "#F2EFE9",
  textSecondary: "#A8A39A",
  textTertiary: "#7A766E",
  borderDefault: "#3A3632",
  borderStrong: "#4A4640",
  accent: "#89A99B",
  accentHover: "#9ABAAC",
  accentSubtle: "#2E3A35",
  accentOn: "#1A1816",
  coachAccent: "#A797CC",
  coachSubtle: "#342E42",
  partyInitiator: "#8BA3C2",
  partyInitiatorSubtle: "#2C3542",
  partyInvitee: "#CC96A9",
  partyInviteeSubtle: "#3E2E34",
  danger: "#CC786D",
  dangerSubtle: "#3E2A27",
  warning: "#CC9F6D",
  warningSubtle: "#3E3228",
  success: "#89A99B",
  privateTint: "#2D2924",
} as const;

// ---------------------------------------------------------------------------
// Typography (StyleGuide §3.3)
// ---------------------------------------------------------------------------

export const typography = {
  display: { size: 32, lineHeight: 40, weight: 500, letterSpacing: "-0.02em" },
  h1: { size: 24, lineHeight: 32, weight: 500, letterSpacing: "-0.015em" },
  h2: { size: 20, lineHeight: 28, weight: 500, letterSpacing: "-0.01em" },
  h3: { size: 17, lineHeight: 24, weight: 500, letterSpacing: "0" },
  body: { size: 15, lineHeight: 1.6, weight: 400, letterSpacing: "0" },
  chat: { size: 16, lineHeight: 1.55, weight: 400, letterSpacing: "0" },
  label: { size: 14, lineHeight: 20, weight: 500, letterSpacing: "0" },
  meta: { size: 13, lineHeight: 18, weight: 400, letterSpacing: "0" },
  timestamp: { size: 12, lineHeight: 16, weight: 400, letterSpacing: "0" },
} as const;

export const fontFamily = {
  sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

// ---------------------------------------------------------------------------
// Radius (StyleGuide §4.2)
// ---------------------------------------------------------------------------

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

// ---------------------------------------------------------------------------
// Shadows (StyleGuide §4.3)
// ---------------------------------------------------------------------------

export const shadows = {
  0: "none",
  1: "0 1px 2px rgba(0, 0, 0, 0.04)",
  2: "0 4px 12px rgba(0, 0, 0, 0.06)",
  3: "0 12px 32px rgba(0, 0, 0, 0.10)",
} as const;

export const shadowsDark = {
  0: "none",
  1: "0 1px 2px rgba(0, 0, 0, 0.20)",
  2: "0 4px 12px rgba(0, 0, 0, 0.28)",
  3: "0 12px 32px rgba(0, 0, 0, 0.40)",
} as const;

// ---------------------------------------------------------------------------
// Spacing (8-point grid)
// ---------------------------------------------------------------------------

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Read a CSS custom property value at runtime. */
export function getCssVar(name: string, el: Element = document.documentElement): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

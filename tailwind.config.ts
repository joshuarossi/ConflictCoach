/**
 * Tailwind CSS configuration
 *
 * In Tailwind v4 the primary theme extension is done via @theme in CSS
 * (see src/index.css). This config file exists as a programmatic mirror
 * so that tests and tooling can import it directly.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "var(--bg-canvas)",
        surface: "var(--bg-surface)",
        "surface-subtle": "var(--bg-surface-subtle)",
        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
          on: "var(--accent-on)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          subtle: "var(--danger-subtle)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          subtle: "var(--warning-subtle)",
        },
        success: "var(--success)",
        "border-default": "var(--border-default)",
        "border-strong": "var(--border-strong)",
        "coach-accent": "var(--coach-accent)",
        "coach-subtle": "var(--coach-subtle)",
        "private-tint": "var(--private-tint)",
        "party-initiator": {
          DEFAULT: "var(--party-initiator)",
          subtle: "var(--party-initiator-subtle)",
        },
        "party-invitee": {
          DEFAULT: "var(--party-invitee)",
          subtle: "var(--party-invitee-subtle)",
        },
      },
      fontSize: {
        display: ["32px", { lineHeight: "40px", letterSpacing: "-0.02em" }],
        h1: ["24px", { lineHeight: "32px", letterSpacing: "-0.015em" }],
        h2: ["20px", { lineHeight: "28px", letterSpacing: "-0.01em" }],
        h3: ["17px", { lineHeight: "24px" }],
        body: ["15px", { lineHeight: "1.6" }],
        chat: ["16px", { lineHeight: "1.55" }],
        label: ["14px", { lineHeight: "20px" }],
        meta: ["13px", { lineHeight: "18px" }],
        timestamp: ["12px", { lineHeight: "16px" }],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        full: "9999px",
      },
      boxShadow: {
        "0": "none",
        "1": "0 1px 2px rgba(0, 0, 0, 0.04)",
        "2": "0 4px 12px rgba(0, 0, 0, 0.06)",
        "3": "0 12px 32px rgba(0, 0, 0, 0.10)",
      },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

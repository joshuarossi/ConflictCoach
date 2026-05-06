## WOR-80: Apply DesignDoc + STYLE_GUIDE consistently across all shipped pages

All hardcoded Tailwind color, typography, spacing, and shadow classes have been
replaced with the project's design tokens (e.g. `bg-accent`, `text-label`,
`shadow-2`) across every shipped page and shared UI component. This delivers a
uniform visual language — consistent card styling, button sizing, type scale,
and color palette — without changing any features or behavior.

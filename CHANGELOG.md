# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **WOR-42:** PrivacyBanner component — reusable banner that visually declares private data contexts per PRD §6. Renders a `--private-tint` (#F0E9E0) background with an interactive lock icon that opens a modal explaining privacy boundaries. Accepts `text` and optional `otherPartyName` props for personalized copy (e.g., "Jordan can't see this"). Includes screen reader text, ARIA region role, and keyboard-accessible lock button. Located at `src/components/PrivacyBanner.tsx`.
- **WOR-23:** Project scaffolding — Vite + React 18 + TypeScript (strict mode) + Convex + Tailwind CSS v4 + shadcn/ui + React Router v6 + ESLint + Prettier. Provides a fully working dev environment: `npm run dev` starts the Vite server, `npx convex dev` connects the backend, and all lint/typecheck gates pass cleanly.

### Changed

- **WOR-42:** Vite dev server now runs on port 5174 (was 5173) to avoid conflicts with other local services. Playwright E2E config updated accordingly.

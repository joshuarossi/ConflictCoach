# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **WOR-28:** Error code normalization — shared `throwAppError(code, message)` utility (`convex/lib/errors.ts`) that wraps all backend errors in `ConvexError` with a `{ code, message, httpStatus }` shape, plus a client-side `parseConvexError` parser (`src/lib/errors.ts`). Defines all 9 standard error codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INVALID_INPUT`, `TOKEN_INVALID`, `RATE_LIMITED`, `AI_ERROR`, `INTERNAL`.
- **WOR-25:** Convex schema definition — `convex/schema.ts` defines all 11 tables (users, cases, partyStates, privateMessages, jointMessages, draftSessions, draftMessages, inviteTokens, templates, templateVersions, auditLog) with full field validators, indexes, and type-safe foreign keys matching TechSpec §3.1. Key invariants (templateVersionId immutability, privateMessages isolation, schemaVersion presence) are documented inline.
- **WOR-23:** Project scaffolding — Vite + React 18 + TypeScript (strict mode) + Convex + Tailwind CSS v4 + shadcn/ui + React Router v6 + ESLint + Prettier. Provides a fully working dev environment: `npm run dev` starts the Vite server, `npx convex dev` connects the backend, and all lint/typecheck gates pass cleanly.

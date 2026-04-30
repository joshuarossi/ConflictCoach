# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **WOR-25:** Convex schema definition — `convex/schema.ts` defines all 11 tables (users, cases, partyStates, privateMessages, jointMessages, draftSessions, draftMessages, inviteTokens, templates, templateVersions, auditLog) with full field validators, indexes, and type-safe foreign keys matching TechSpec §3.1. Key invariants (templateVersionId immutability, privateMessages isolation, schemaVersion presence) are documented inline.
- **WOR-23:** Project scaffolding — Vite + React 18 + TypeScript (strict mode) + Convex + Tailwind CSS v4 + shadcn/ui + React Router v6 + ESLint + Prettier. Provides a fully working dev environment: `npm run dev` starts the Vite server, `npx convex dev` connects the backend, and all lint/typecheck gates pass cleanly.

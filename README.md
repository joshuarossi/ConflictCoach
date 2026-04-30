# Conflict Coach

AI-powered conflict resolution coaching platform built with React, Convex, and Claude.

## Prerequisites

- Node.js 18+
- A [Convex](https://www.convex.dev/) account (free tier works)
- An [Anthropic](https://console.anthropic.com/) API key

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   Required variables (see `.env.example`):

   | Variable | Description |
   |---|---|
   | `VITE_CONVEX_URL` | Convex deployment URL (set automatically by `npx convex dev`) |
   | `CONVEX_DEPLOYMENT` | Convex deployment identifier |
   | `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
   | `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID |
   | `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
   | `MAGIC_LINK_EMAIL_FROM` | Sender address for magic-link emails |
   | `SITE_URL` | Public URL of the app |

3. **Start the Convex backend**

   ```bash
   npx convex dev
   ```

4. **Start the Vite dev server** (in a second terminal)

   ```bash
   npm run dev
   ```

   The app is served at [http://localhost:5173](http://localhost:5173).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript (strict mode)
- **Styling:** Tailwind CSS v4, shadcn/ui
- **Routing:** React Router v6
- **Backend:** Convex (database, serverless functions, realtime, auth)
- **AI:** Anthropic Claude (via `@anthropic-ai/sdk`)
- **Testing:** Vitest (unit), Playwright (e2e)
- **Lint/Format:** ESLint, Prettier

## Project Structure

```
├── convex/              # Convex backend (schema, queries, mutations, actions)
├── e2e/                 # Playwright end-to-end tests
├── src/
│   ├── components/ui/   # shadcn/ui primitives
│   ├── lib/             # Shared utilities
│   ├── App.tsx          # Root component with React Router
│   ├── main.tsx         # Entry point
│   └── index.css        # Tailwind CSS entry
├── tests/               # Vitest unit tests
├── .env.example         # Required environment variables
├── eslint.config.mjs    # ESLint flat config
├── tsconfig.json        # TypeScript config (strict, @/ path alias)
└── vite.config.ts       # Vite config with React + Tailwind plugins
```

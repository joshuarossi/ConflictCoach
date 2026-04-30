# Conflict Coach

AI-guided mediation for better conversations.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Routing:** React Router v6
- **Backend:** Convex (database, functions, realtime, auth)
- **Lint/Format:** ESLint + Prettier

## Prerequisites

- Node.js 18+
- A Convex account (for backend services)

## Getting Started

1. **Clone and install dependencies:**

   ```bash
   git clone <repo-url> && cd conflict-coach
   npm install
   ```

2. **Set up environment variables:**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the values — see [Environment Variables](#environment-variables) below.

3. **Start the Convex backend:**

   ```bash
   npx convex dev
   ```

4. **Start the Vite dev server** (in a separate terminal):

   ```bash
   npm run dev
   ```

## Scripts

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `npm run dev`      | Start Vite dev server              |
| `npm run build`    | Typecheck + production build       |
| `npm run lint`     | Run ESLint                         |
| `npm run preview`  | Preview production build           |
| `npm run test`     | Run Vitest unit tests              |
| `npm run test:e2e` | Run Playwright end-to-end tests    |

## Environment Variables

Copy `.env.example` to `.env.local` and populate:

| Variable                     | Description                              |
| ---------------------------- | ---------------------------------------- |
| `VITE_CONVEX_URL`            | Convex deployment URL (client-side)      |
| `CONVEX_DEPLOYMENT`          | Convex deployment identifier             |
| `ANTHROPIC_API_KEY`          | Anthropic API key for Claude AI features |
| `GOOGLE_OAUTH_CLIENT_ID`     | Google OAuth client ID                   |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret               |
| `MAGIC_LINK_EMAIL_FROM`      | Sender address for magic link emails     |
| `SITE_URL`                   | Public URL of the deployed site          |

## Path Aliases

TypeScript and Vite are configured with `@/` mapping to `src/`:

```ts
import { Button } from "@/components/ui/button";
```

## Project Structure

```
├── convex/              # Convex backend (schema, functions)
├── src/
│   ├── components/
│   │   └── ui/          # shadcn/ui primitives (Button, etc.)
│   ├── lib/             # Shared utilities (cn helper, etc.)
│   └── styles/          # Global CSS + design tokens
├── .env.example         # Required environment variables
├── tsconfig.json        # TypeScript config (strict mode)
└── vite.config.ts       # Vite config (React + Tailwind plugins)
```

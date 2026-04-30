# Conflict Coach

AI-powered conflict coaching and mediation platform.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Routing:** React Router v6
- **Backend:** Convex (DB + functions + realtime + auth)
- **AI:** Anthropic Claude (Sonnet + Haiku)
- **Testing:** Vitest (unit), Playwright (e2e)
- **Lint/Format:** ESLint + Prettier

## Prerequisites

- Node.js 18+
- A Convex account (for backend)

## Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy `.env.example` to `.env.local` and fill in values:

   ```bash
   cp .env.example .env.local
   ```

   Required variables:

   | Variable | Description |
   |---|---|
   | `VITE_CONVEX_URL` | Convex deployment URL (used by the client) |
   | `CONVEX_DEPLOYMENT` | Convex deployment identifier |
   | `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
   | `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID |
   | `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
   | `MAGIC_LINK_EMAIL_FROM` | Sender address for magic-link emails |
   | `SITE_URL` | Public URL of the app |

3. **Start the Vite dev server:**

   ```bash
   npm run dev
   ```

4. **Start the Convex backend (separate terminal):**

   ```bash
   npx convex dev
   ```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |

## Path Aliases

TypeScript and Vite are configured with `@/` mapping to `src/`:

```ts
import { Button } from "@/components/ui/button";
```

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
   | `AUTH_GOOGLE_ID` | Google OAuth client ID |
   | `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
   | `AUTH_SECRET` | Convex Auth session secret (generate with `openssl rand -base64 32`) |
   | `RESEND_API_KEY` | Resend API key used to send magic-link emails |
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

   The app is served at [http://localhost:5174](http://localhost:5174).

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
- **Styling:** Tailwind CSS v4, shadcn/ui, design tokens ([guide](docs/design-tokens.md))
- **Routing:** React Router v6
- **Backend:** Convex (database, serverless functions, realtime, auth)
- **AI:** Anthropic Claude (via `@anthropic-ai/sdk`)
- **Testing:** Vitest (unit), Playwright (e2e)
- **Lint/Format:** ESLint, Prettier

## Continuous Integration

A GitHub Actions workflow runs on every push to `main` and on PRs targeting `main`. It executes **lint**, **typecheck**, and **unit** jobs in parallel, followed by an **e2e** job (Playwright with `CLAUDE_MOCK=true`) that is gated on the first three passing. See [docs/testing.md](docs/testing.md#continuous-integration) for full details.

The workflow requires two repository secrets: `CONVEX_DEPLOY_KEY` and `ANTHROPIC_API_KEY`.

## Project Structure

```
├── convex/              # Convex backend (schema, queries, mutations, actions)
├── e2e/                 # Playwright end-to-end tests
├── src/
│   ├── components/      # Shared app components (PrivacyBanner, etc.)
│   │   └── ui/          # shadcn/ui primitives
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

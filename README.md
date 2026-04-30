# Conflict Coach

Navigate conflict with confidence — an AI-powered coaching platform.

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Routing:** React Router v6
- **Backend:** Convex (database, functions, realtime, auth)
- **AI:** Anthropic Claude (Sonnet + Haiku)
- **Testing:** Vitest (unit), Playwright (e2e)
- **Lint/Format:** ESLint + Prettier

## Getting Started

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   Required variables:

   | Variable | Description |
   |---|---|
   | `VITE_CONVEX_URL` | Convex deployment URL (public) |
   | `CONVEX_DEPLOYMENT` | Convex deployment identifier |
   | `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
   | `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID |
   | `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
   | `MAGIC_LINK_EMAIL_FROM` | Sender address for magic-link emails |
   | `SITE_URL` | Public URL of the app |

3. Start the Vite dev server:

   ```bash
   npm run dev
   ```

4. In a separate terminal, start the Convex backend:

   ```bash
   npx convex dev
   ```

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

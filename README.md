# Conflict Coach

AI-powered conflict coaching and facilitation platform.

## Prerequisites

- Node.js 18+
- A [Convex](https://www.convex.dev/) account (for backend/DB)

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env.local

# Start the Convex backend (initializes schema, generates types)
npx convex dev

# In a separate terminal, start the Vite dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

## Environment Variables

All required variables are documented in `.env.example`:

| Variable | Purpose |
|---|---|
| `VITE_CONVEX_URL` | Convex deployment URL (used by the React client) |
| `CONVEX_DEPLOYMENT` | Convex deployment identifier |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude AI coaching |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID for sign-in |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Google OAuth client secret |
| `MAGIC_LINK_EMAIL_FROM` | Sender address for magic-link emails |
| `SITE_URL` | Public URL of the deployed site |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript (strict)
- **Styling:** Tailwind CSS, shadcn/ui
- **Routing:** React Router v6
- **Backend:** Convex (database, functions, realtime, auth)
- **AI:** Anthropic Claude (via server-side Convex actions)
- **Testing:** Vitest (unit), Playwright (e2e)
- **Lint/Format:** ESLint, Prettier

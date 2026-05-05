# Landing Page

The landing page is the public-facing entry point at `/` for logged-out visitors. Its purpose is to communicate what Conflict Coach does and funnel visitors toward signing in.

## Route Behavior

- **Logged-out users** see the landing page at `/`.
- **Logged-in users** are automatically redirected to `/dashboard`.

The auth state is detected via the `useConvexAuth` hook from `@convex-dev/auth/react`.

## Content Sections

### Hero

Displays the product tagline:

> A calm place to work through a difficult conversation.

A subheading provides additional context, and the primary CTA button ("Start a case") links to `/login`.

### Three-Step Explainer

An iconographic section showing the core flow:

1. **Private Coaching** — Work through your perspective privately with an AI coach.
2. **Shared Conversation** — Come together in a facilitated discussion with AI guidance.
3. **Resolution** — Reach understanding and agreement on your own terms.

Icons are sourced from `lucide-react` (MessageCircle, Users, ShieldCheck).

### Privacy Section

Reassures visitors with the heading "Your words are yours" and a brief explanation of data handling. Links to the `/privacy` policy page.

### Footer

Contains links to:

- `/terms` — Terms of service
- `/privacy` — Privacy policy

## Design Tokens

The page uses CSS custom properties from the design system:

- Typography: 32px mobile / 40px desktop headline, weight 500, letter-spacing -0.02em
- Layout: max-width 720px for content areas
- Colors: `--bg-canvas`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--accent`, `--accent-hover`, `--accent-on`
- Borders: `--border-default`
- Radius: `--radius-md`

## Design Constraints (per DesignDoc §4.1)

The landing page explicitly excludes:

- Testimonials
- Pricing information
- Repeated CTAs

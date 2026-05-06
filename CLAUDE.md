<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

## Styling

Never use raw Tailwind color, typography, or spacing classes — always use design tokens (`bg-accent`, `text-h1`, `shadow-2`, etc.). See [docs/design-tokens.md](docs/design-tokens.md) for the full token list and contributing rules. Token-usage tests enforce this automatically.

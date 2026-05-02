## WOR-79: CI pipeline (GitHub Actions)

Added a GitHub Actions CI workflow (`.github/workflows/ci.yml`) that runs on every push to `main` and on pull requests targeting `main`. The pipeline runs four parallel-then-gated jobs: **lint** (ESLint + Prettier), **typecheck** (`tsc --noEmit`), **unit** (Vitest), and **e2e** (Playwright against a Convex dev deployment with `CLAUDE_MOCK=true`). The E2E job only runs after the first three jobs pass, and uploads Playwright reports and screenshots as artifacts on failure.

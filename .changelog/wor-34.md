### WOR-34: Dashboard frontend

Added the Dashboard as the user's home screen after login (`/dashboard`). Cases are listed in two groups — Active and Closed — with the Closed section collapsed by default. Each case row displays the other party's name, category, created date, status text, last activity time, and an Enter button. Color-coded status glyphs (● green = your turn, ○ gray = waiting, ◐ amber = ready for joint, ◼ neutral = closed) communicate turn-based state at a glance. A prominent "+New Case" button routes to `/cases/new`, and an empty-state message is shown when no cases exist.

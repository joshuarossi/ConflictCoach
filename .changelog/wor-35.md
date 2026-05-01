### WOR-35: Case creation backend

Added the `cases/create` mutation — the backend entry point for starting a new conflict mediation case. The mutation accepts a category, topic, and optional description/desired-outcome, pins the active template version, creates the case and initiator party state, and generates a cryptographic invite token with a shareable invite URL. Solo mode (`isSolo: true`) skips the invite token and immediately sets up both party-state rows for the same user.

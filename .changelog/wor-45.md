# WOR-45: AI Synthesis Generation

Added automatic synthesis generation that runs when both parties complete
private coaching. The system reads each party's private messages and form
fields, calls Claude to produce individualized joint-session guidance per
party, validates the output with a privacy filter (retrying up to twice on
violation), and atomically writes the results while advancing the case to
READY_FOR_JOINT status.

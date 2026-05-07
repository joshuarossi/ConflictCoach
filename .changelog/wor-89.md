## WOR-89: Fix "Enter joint session" button error for the second party

The `enterJointSession` mutation is now idempotent: when the case is
already `JOINT_ACTIVE` (because the other party entered first), the call
returns successfully instead of throwing a `CONFLICT 409` error. This
lets both parties use the "Enter joint session" button without seeing an
error toast, while preserving all existing authorization and
state-machine guards.

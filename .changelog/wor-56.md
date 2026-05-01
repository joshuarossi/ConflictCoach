### WOR-56: Invite redemption backend

Added the `invites/redeem` mutation — the backend endpoint that fires when an invited party accepts an invite link. The mutation validates the token is active, prevents self-invite (the case initiator cannot redeem their own invite), and atomically binds the authenticated user to the case as the invitee, creates their party state (`role: INVITEE`), transitions the case from `DRAFT_PRIVATE_COACHING` to `BOTH_PRIVATE_COACHING`, and marks the token as `CONSUMED` so it cannot be reused.

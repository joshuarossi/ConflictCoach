# WOR-47: Joint Chat Backend

Added the joint chat backend (`convex/jointChat.ts`) — the data layer
powering real-time communication between both parties during the joint
session. Includes a reactive `messages` query that streams all joint
messages to subscribed clients, a `sendUserMessage` mutation that records
a party's message and schedules AI Coach response generation, and a
`mySynthesis` query that returns the caller's own synthesis text. All
three functions enforce authentication and party-to-case authorization,
and validate that the case is in an appropriate status before allowing
reads or writes.

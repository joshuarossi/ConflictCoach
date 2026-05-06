### WOR-67: CaseDetail routing component

The `/cases/:caseId` page now acts as a lifecycle-aware routing hub. It fetches the case via the `cases/get` query, displays a context header ("Case with [other party] · [phase]"), and renders the correct sub-view — Private Coaching, Ready for Joint, Joint Chat, or Closed — based on the current case status. A skeleton loading state is shown while data loads, and a 404 view is displayed if the case is not found or the user is not a party.

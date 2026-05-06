/**
 * WOR-54 test mocks for the closed case view.
 *
 * These tests render the connected ClosedCaseView component, which calls
 * useQuery against four api refs (cases.get, jointChat.messages,
 * privateCoaching.myMessages, jointChat.mySynthesis). The convex anyApi
 * proxy throws on String() coercion, so dispatch must compare api refs by
 * identity, not by stringified name.
 *
 * Usage:
 *   import { apiMock, makeUseQueryDispatcher } from "./__helpers__/closed-case-mocks";
 *   vi.mock("../../convex/_generated/api", () => apiMock);
 *   const dispatch = makeUseQueryDispatcher({ caseDoc, jointMessages, ... });
 *   vi.mock("convex/react", () => ({
 *     useQuery: (ref: unknown) => dispatch(ref),
 *     useMutation: () => vi.fn(),
 *   }));
 */
export const apiMock = {
  api: {
    cases: {
      get: "cases:get",
      partyStates: "cases:partyStates",
    },
    jointChat: {
      messages: "jointChat:messages",
      mySynthesis: "jointChat:mySynthesis",
    },
    privateCoaching: {
      myMessages: "privateCoaching:myMessages",
    },
    users: { me: "users:me" },
  },
};

export interface CaseDoc {
  _id: string;
  status: string;
  category?: string;
  closedAt?: number;
  closureSummary?: string | null;
  closureOutcome?: "RESOLVED" | "NOT_RESOLVED" | "ABANDONED" | null;
  isSolo?: boolean;
  initiatorUserId?: string;
  inviteeUserId?: string;
  schemaVersion?: number;
  templateVersionId?: string;
  createdAt?: number;
  updatedAt?: number;
  [k: string]: unknown;
}

export interface PartyStateRow {
  userId: string;
  role: "INITIATOR" | "INVITEE";
  privateCoachingCompletedAt?: number | null;
  synthesisText?: string | null;
}

export interface PartyData {
  self: PartyStateRow;
  other: PartyStateRow;
  all: PartyStateRow[];
}

export interface DispatcherOpts {
  caseDoc?: CaseDoc | null;
  partyData?: PartyData | null;
  jointMessages?: unknown[];
  privateMessages?: unknown[];
  synthesis?: string | { synthesisText?: string | null } | null;
  user?: { role: string; displayName?: string; _id?: string } | null;
}

export const defaultPartyData: PartyData = {
  self: {
    userId: "users:u1",
    role: "INITIATOR",
    privateCoachingCompletedAt: 1700050000000,
    synthesisText: null,
  },
  other: {
    userId: "users:u2",
    role: "INVITEE",
    privateCoachingCompletedAt: 1700050000000,
    synthesisText: null,
  },
  all: [
    {
      userId: "users:u1",
      role: "INITIATOR",
      privateCoachingCompletedAt: 1700050000000,
      synthesisText: null,
    },
    {
      userId: "users:u2",
      role: "INVITEE",
      privateCoachingCompletedAt: 1700050000000,
      synthesisText: null,
    },
  ],
};

export function makeUseQueryDispatcher(opts: DispatcherOpts = {}) {
  return (token: unknown) => {
    switch (token) {
      case "cases:get":
        return opts.caseDoc ?? undefined;
      case "cases:partyStates":
        return opts.partyData ?? defaultPartyData;
      case "jointChat:messages":
        return opts.jointMessages ?? [];
      case "privateCoaching:myMessages":
        return opts.privateMessages ?? [];
      case "jointChat:mySynthesis":
        return opts.synthesis ?? null;
      case "users:me":
        return opts.user ?? { role: "USER", displayName: "Test User" };
      default:
        return undefined;
    }
  };
}

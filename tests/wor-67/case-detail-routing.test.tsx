/**
 * WOR-67: CaseDetail routing component tests
 *
 * Covers:
 * - AC: CaseDetail reads case status via cases/get query
 * - AC: Routes to PrivateCoachingView for DRAFT_PRIVATE_COACHING and BOTH_PRIVATE_COACHING
 * - AC: Routes to ReadyForJointView for READY_FOR_JOINT
 * - AC: Routes to JointChatView for JOINT_ACTIVE
 * - AC: Routes to ClosedCaseView for CLOSED_* statuses
 */
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Track what useQuery returns for each test
let mockCaseData: unknown = undefined;

vi.mock("@convex-dev/auth/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: true }),
  useAuthActions: () => ({ signIn: vi.fn(), signOut: vi.fn() }),
}));

vi.mock("convex/react", () => ({
  useQuery: () => mockCaseData,
  useMutation: () => vi.fn(),
}));

import { CaseDetail } from "@/pages/CaseDetail";

function renderCaseDetail(caseId = "test-case-123") {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}`]}>
      <Routes>
        <Route path="/cases/:caseId" element={<CaseDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockCaseData = undefined;
});

describe("AC: CaseDetail reads case status via cases/get query", () => {
  test("renders content based on the case data returned by useQuery", () => {
    mockCaseData = {
      _id: "test-case-123",
      status: "DRAFT_PRIVATE_COACHING",
      initiatorUserId: "user-1",
      inviteeUserId: "user-2",
      category: "workplace",
    };
    renderCaseDetail();
    // When useQuery returns data, the component should not show loading
    expect(
      screen.queryByTestId("case-detail-skeleton"),
    ).not.toBeInTheDocument();
  });
});

describe("AC: Routes to PrivateCoachingView for DRAFT_PRIVATE_COACHING and BOTH_PRIVATE_COACHING", () => {
  test("renders PrivateCoachingView for DRAFT_PRIVATE_COACHING status", () => {
    mockCaseData = {
      _id: "test-case-123",
      status: "DRAFT_PRIVATE_COACHING",
      initiatorUserId: "user-1",
      inviteeUserId: "user-2",
      category: "workplace",
    };
    renderCaseDetail();
    expect(
      screen.getByTestId("private-coaching-view"),
    ).toBeInTheDocument();
  });

  test("renders PrivateCoachingView for BOTH_PRIVATE_COACHING status", () => {
    mockCaseData = {
      _id: "test-case-123",
      status: "BOTH_PRIVATE_COACHING",
      initiatorUserId: "user-1",
      inviteeUserId: "user-2",
      category: "workplace",
    };
    renderCaseDetail();
    expect(
      screen.getByTestId("private-coaching-view"),
    ).toBeInTheDocument();
  });
});

describe("AC: Routes to ReadyForJointView for READY_FOR_JOINT", () => {
  test("renders ReadyForJointView for READY_FOR_JOINT status", () => {
    mockCaseData = {
      _id: "test-case-123",
      status: "READY_FOR_JOINT",
      initiatorUserId: "user-1",
      inviteeUserId: "user-2",
      category: "workplace",
    };
    renderCaseDetail();
    expect(
      screen.getByTestId("ready-for-joint-view"),
    ).toBeInTheDocument();
  });
});

describe("AC: Routes to JointChatView for JOINT_ACTIVE", () => {
  test("renders JointChatView for JOINT_ACTIVE status", () => {
    mockCaseData = {
      _id: "test-case-123",
      status: "JOINT_ACTIVE",
      initiatorUserId: "user-1",
      inviteeUserId: "user-2",
      category: "workplace",
    };
    renderCaseDetail();
    expect(
      screen.getByTestId("joint-chat-view"),
    ).toBeInTheDocument();
  });
});

describe("AC: Routes to ClosedCaseView for CLOSED_* statuses", () => {
  test("renders ClosedCaseView for CLOSED_RESOLVED status", () => {
    mockCaseData = {
      _id: "test-case-123",
      status: "CLOSED_RESOLVED",
      initiatorUserId: "user-1",
      inviteeUserId: "user-2",
      category: "workplace",
    };
    renderCaseDetail();
    expect(
      screen.getByTestId("closed-case-view"),
    ).toBeInTheDocument();
  });

  test("renders ClosedCaseView for CLOSED_UNRESOLVED status", () => {
    mockCaseData = {
      _id: "test-case-123",
      status: "CLOSED_UNRESOLVED",
      initiatorUserId: "user-1",
      inviteeUserId: "user-2",
      category: "workplace",
    };
    renderCaseDetail();
    expect(
      screen.getByTestId("closed-case-view"),
    ).toBeInTheDocument();
  });

  test("renders ClosedCaseView for CLOSED_ABANDONED status", () => {
    mockCaseData = {
      _id: "test-case-123",
      status: "CLOSED_ABANDONED",
      initiatorUserId: "user-1",
      inviteeUserId: "user-2",
      category: "workplace",
    };
    renderCaseDetail();
    expect(
      screen.getByTestId("closed-case-view"),
    ).toBeInTheDocument();
  });
});

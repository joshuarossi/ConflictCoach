/**
 * WOR-77 E2E: State machine enforcement
 *
 * Validates that the case lifecycle state machine rejects illegal transitions
 * with clear error codes and handles idempotent operations correctly.
 *
 * Requires: CLAUDE_MOCK=true for deterministic AI stubs and test fixtures.
 */
import { test, expect } from "@playwright/test";

import {
  createTestUser,
  loginAsUser,
  createTestCase,
  callMutation,
} from "../fixtures";

test.describe("WOR-77: State machine enforcement", () => {
  test("AC1: Sending a joint message when case is in DRAFT_PRIVATE_COACHING fails with CONFLICT", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const caseData = await createTestCase(page, user);

    // Attempt to send a joint message while case is still in DRAFT_PRIVATE_COACHING
    const result = await callMutation(page, "jointChat:sendUserMessage", {
      caseId: caseData.caseId,
      content: "This should not be allowed",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("CONFLICT");
    }
  });

  test("AC2: Marking private coaching complete twice is idempotent (no error on second call)", async ({
    page,
  }) => {
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const caseData = await createTestCase(page, user, { isSolo: true });

    // Send at least one private coaching message first (prerequisite)
    const sendResult = await callMutation(page, "privateCoaching:sendMessage", {
      caseId: caseData.caseId,
      content: "I want to work through this conflict",
    });
    expect(sendResult.ok).toBe(true);

    // First mark-complete call should succeed
    const firstComplete = await callMutation(
      page,
      "privateCoaching:markComplete",
      {
        caseId: caseData.caseId,
      },
    );
    expect(firstComplete.ok).toBe(true);

    // Second mark-complete call should also succeed (idempotent)
    const secondComplete = await callMutation(
      page,
      "privateCoaching:markComplete",
      {
        caseId: caseData.caseId,
      },
    );
    expect(secondComplete.ok).toBe(true);
  });

  test("AC3: Redeeming a consumed invite token fails with TOKEN_INVALID", async ({
    page,
  }) => {
    // User A creates a two-party case — invite token is returned at creation time
    const userA = await createTestUser(page);
    await loginAsUser(page, userA);
    const caseData = await createTestCase(page, userA, { isSolo: false });

    const token = caseData.inviteToken;
    expect(token).toBeTruthy();

    // User B redeems the token successfully
    const userB = await createTestUser(page);
    await loginAsUser(page, userB);
    const redeemResult = await callMutation(page, "invites:redeem", {
      token: token!,
    });
    expect(redeemResult.ok).toBe(true);

    // User C attempts to redeem the same (now consumed) token
    const userC = await createTestUser(page);
    await loginAsUser(page, userC);
    const replayResult = await callMutation(page, "invites:redeem", {
      token: token!,
    });
    expect(replayResult.ok).toBe(false);
    if (!replayResult.ok) {
      expect(replayResult.code).toBe("TOKEN_INVALID");
    }
  });

  test("AC4: Entering joint chat before both parties complete private coaching fails with CONFLICT", async ({
    page,
  }) => {
    // Create a two-party case — invite token comes from case creation
    const userA = await createTestUser(page);
    await loginAsUser(page, userA);
    const caseData = await createTestCase(page, userA, { isSolo: false });

    const token = caseData.inviteToken;
    expect(token).toBeTruthy();

    // User B redeems the invite
    const userB = await createTestUser(page);
    await loginAsUser(page, userB);
    await callMutation(page, "invites:redeem", { token: token! });

    // Only user A marks private coaching complete
    await loginAsUser(page, userA);
    await callMutation(page, "privateCoaching:sendMessage", {
      caseId: caseData.caseId,
      content: "Working through my perspective",
    });
    const markResult = await callMutation(
      page,
      "privateCoaching:markComplete",
      {
        caseId: caseData.caseId,
      },
    );
    expect(markResult.ok).toBe(true);

    // Attempt to send a joint message — should fail because user B hasn't completed PC
    const jointResult = await callMutation(page, "jointChat:sendUserMessage", {
      caseId: caseData.caseId,
      content: "Trying to jump ahead",
    });
    expect(jointResult.ok).toBe(false);
    if (!jointResult.ok) {
      expect(jointResult.code).toBe("CONFLICT");
    }
  });

  test("AC5: Sending messages after case closure fails with CONFLICT", async ({
    page,
  }) => {
    // Create a solo case and drive it through the full lifecycle to CLOSED_RESOLVED
    const user = await createTestUser(page);
    await loginAsUser(page, user);
    const caseData = await createTestCase(page, user, { isSolo: true });

    // Send a private coaching message and mark complete (as initiator — default party)
    await callMutation(page, "privateCoaching:sendMessage", {
      caseId: caseData.caseId,
      content: "Working through my side",
    });
    await callMutation(page, "privateCoaching:markComplete", {
      caseId: caseData.caseId,
    });

    // In solo mode, switch to the invitee party context before completing their side.
    // WOR-77: The exact solo-mode party-switching API must be provided by the
    // implementation (e.g. cases:switchParty or an equivalent mutation).
    await callMutation(page, "cases:switchParty", {
      caseId: caseData.caseId,
    });

    await callMutation(page, "privateCoaching:sendMessage", {
      caseId: caseData.caseId,
      content: "Working through the other side",
    });
    await callMutation(page, "privateCoaching:markComplete", {
      caseId: caseData.caseId,
    });

    // Close the case
    await callMutation(page, "cases:proposeClosure", {
      caseId: caseData.caseId,
      summary: "We resolved our differences",
    });
    await callMutation(page, "cases:confirmClosure", {
      caseId: caseData.caseId,
    });

    // Now attempt to send a joint message — should fail with CONFLICT
    const result = await callMutation(page, "jointChat:sendUserMessage", {
      caseId: caseData.caseId,
      content: "This should not be allowed after closure",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("CONFLICT");
    }
  });
});

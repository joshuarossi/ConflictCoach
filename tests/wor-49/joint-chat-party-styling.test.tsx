import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
// @ts-expect-error WOR-49 red-state import: implementation is created by task-implement.
import { JointChatView } from "@/components/JointChatView";

/**
 * AC: Party avatars use correct colors: initiator=--party-initiator,
 *     invitee=--party-invitee, coach=--coach-accent
 *
 * AC: Coach messages have --coach-subtle background, --coach-accent left
 *     border, and diamond glyph. Intervention messages have 4px border.
 *
 * These tests verify the joint-chat-specific CSS classes defined in the
 * DesignDoc StyleGuide:
 *   .avatar-initiator, .avatar-invitee, .avatar-coach
 *   .bubble-coach-joint, .bubble-coach-intervention
 *   .bubble-party-initiator, .bubble-party-invitee
 */

const baseProps = {
  currentUserId: "user-alice",
  initiatorUserId: "user-alice",
  inviteeUserId: "user-jordan",
  initiatorName: "Alice",
  inviteeName: "Jordan",
  caseName: "Workplace dispute",
  isStreaming: false,
  onSendMessage: vi.fn(),
  onOpenDraftCoach: vi.fn(),
  onOpenGuidance: vi.fn(),
  onOpenClosure: vi.fn(),
};

describe("JointChatView — party avatar colors", () => {
  it("initiator messages have .avatar-initiator on the avatar element", () => {
    const messages = [
      {
        _id: "msg-init",
        authorType: "USER" as const,
        authorUserId: "user-alice",
        content: "Initiator message",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: 1000,
      },
    ];

    const { container } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    const avatar = container.querySelector(".avatar-initiator");
    expect(avatar).not.toBeNull();
  });

  it("invitee messages have .avatar-invitee on the avatar element", () => {
    const messages = [
      {
        _id: "msg-inv",
        authorType: "USER" as const,
        authorUserId: "user-jordan",
        content: "Invitee message",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: 1000,
      },
    ];

    const { container } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    const avatar = container.querySelector(".avatar-invitee");
    expect(avatar).not.toBeNull();
  });

  it("coach messages have .avatar-coach on the avatar element", () => {
    const messages = [
      {
        _id: "msg-coach",
        authorType: "COACH" as const,
        authorUserId: undefined,
        content: "Coach message",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: 1000,
      },
    ];

    const { container } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    const avatar = container.querySelector(".avatar-coach");
    expect(avatar).not.toBeNull();
  });
});

describe("JointChatView — coach message styling", () => {
  it("regular coach messages have .bubble-coach-joint class (3px left border)", () => {
    const messages = [
      {
        _id: "msg-coach-reg",
        authorType: "COACH" as const,
        authorUserId: undefined,
        content: "A facilitation note.",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: 1000,
      },
    ];

    const { container } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    const bubble = container.querySelector(".bubble-coach-joint");
    expect(bubble).not.toBeNull();
  });

  it("coach intervention messages have .bubble-coach-intervention class (4px left border)", () => {
    const messages = [
      {
        _id: "msg-coach-int",
        authorType: "COACH" as const,
        authorUserId: undefined,
        content: "Let's pause and reframe.",
        status: "COMPLETE" as const,
        isIntervention: true,
        createdAt: 1000,
      },
    ];

    const { container } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    const bubble = container.querySelector(".bubble-coach-intervention");
    expect(bubble).not.toBeNull();
  });

  it("coach messages display the diamond glyph", () => {
    const messages = [
      {
        _id: "msg-coach-glyph",
        authorType: "COACH" as const,
        authorUserId: undefined,
        content: "Welcome everyone.",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: 1000,
      },
    ];

    const { container } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    // The diamond glyph U+27E1 should appear near coach messages
    const text = container.textContent ?? "";
    expect(text).toContain("\u27E1");
  });

  it("initiator messages have .bubble-party-initiator class", () => {
    const messages = [
      {
        _id: "msg-pi",
        authorType: "USER" as const,
        authorUserId: "user-alice",
        content: "Initiator here.",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: 1000,
      },
    ];

    const { container } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    const bubble = container.querySelector(".bubble-party-initiator");
    expect(bubble).not.toBeNull();
  });

  it("invitee messages have .bubble-party-invitee class", () => {
    const messages = [
      {
        _id: "msg-pv",
        authorType: "USER" as const,
        authorUserId: "user-jordan",
        content: "Invitee here.",
        status: "COMPLETE" as const,
        isIntervention: false,
        createdAt: 1000,
      },
    ];

    const { container } = render(
      <JointChatView {...baseProps} messages={messages} />,
    );

    const bubble = container.querySelector(".bubble-party-invitee");
    expect(bubble).not.toBeNull();
  });
});

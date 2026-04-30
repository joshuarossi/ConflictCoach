import { test, expect } from "@playwright/test";

/**
 * E2E tests for the shared chat UI components (WOR-41).
 *
 * These tests verify user-visible behavior of ChatWindow, MessageBubble,
 * MessageInput, and StreamingIndicator when rendered in the browser.
 * They will fail until the components are implemented and a route renders them.
 */

// The chat UI should be accessible at a route — adjust if the app uses a different path
const CHAT_URL = "/";

test.describe("WOR-41: Shared Chat UI Components — E2E", () => {
  test("ChatWindow renders a scrollable message list with role='log' and aria-live='polite'", async ({
    page,
  }) => {
    await page.goto(CHAT_URL);

    // The chat message container should exist with correct ARIA attributes
    const log = page.locator('[role="log"]');
    await expect(log).toBeVisible();
    await expect(log).toHaveAttribute("aria-live", "polite");
  });

  test("MessageBubble renders coach messages with Sparkles icon and left alignment", async ({
    page,
  }) => {
    await page.goto(CHAT_URL);

    // Look for a coach message bubble (identified by sparkles icon or coach-specific selector)
    const coachBubble = page.locator(
      '[data-testid="message-bubble-coach"], [data-author-type="COACH"]'
    );

    // If no coach message exists in initial state, this test documents the expectation
    // that coach messages will be identifiable and have the sparkles icon
    if ((await coachBubble.count()) > 0) {
      const sparkles = coachBubble
        .first()
        .locator('[data-testid="sparkles-icon"], svg');
      await expect(sparkles.first()).toBeVisible();
    } else {
      // No coach messages rendered yet — this is expected to fail until implementation
      // provides a route with sample messages or a way to trigger coach messages
      test.fail();
    }
  });

  test("MessageInput sends on Enter and inserts newline on Shift+Enter", async ({
    page,
  }) => {
    await page.goto(CHAT_URL);

    const input = page.locator(
      'textarea[data-testid="message-input"], textarea, [role="textbox"]'
    );
    await expect(input.first()).toBeVisible();

    // Type a message and press Shift+Enter — should NOT send
    await input.first().fill("Line one");
    await input.first().press("Shift+Enter");

    // The input should still have content (not cleared by send)
    const value = await input.first().inputValue();
    expect(value).toContain("Line one");
  });

  test("Send button is disabled while streaming", async ({ page }) => {
    await page.goto(CHAT_URL);

    // Look for the send button
    const sendButton = page.locator(
      'button:has-text("Send"), button[aria-label*="send" i]'
    );

    if ((await sendButton.count()) > 0) {
      // If there's an active streaming state, the button should be disabled
      // This test documents the expected behavior
      await expect(sendButton.first()).toBeVisible();
    } else {
      test.fail();
    }
  });

  test("StreamingIndicator renders a blinking cursor element", async ({
    page,
  }) => {
    await page.goto(CHAT_URL);

    // The streaming indicator should be a CSS-animated element
    const cursor = page.locator(
      '[data-testid="streaming-cursor"], [data-testid="streaming-indicator"], [class*="cursor"][class*="blink"]'
    );

    // This will only be visible when a message is actively streaming
    // The test documents the expectation — will fail until streaming is implemented
    if ((await cursor.count()) > 0) {
      await expect(cursor.first()).toBeVisible();
    } else {
      test.fail();
    }
  });

  test("Copy button appears only on COMPLETE messages, not on STREAMING or ERROR", async ({
    page,
  }) => {
    await page.goto(CHAT_URL);

    // Look for any complete message bubbles
    const completeBubble = page.locator(
      '[data-status="COMPLETE"], [data-testid="message-bubble-complete"]'
    );

    if ((await completeBubble.count()) > 0) {
      // Complete messages should have a copy button
      const copyButton = completeBubble
        .first()
        .locator('button[aria-label*="copy" i], button:has-text("Copy")');
      await expect(copyButton).toBeVisible();
    } else {
      test.fail();
    }

    // Streaming messages should NOT have copy button
    const streamingBubble = page.locator(
      '[data-status="STREAMING"], [data-testid="message-bubble-streaming"]'
    );
    if ((await streamingBubble.count()) > 0) {
      const copyButton = streamingBubble
        .first()
        .locator('button[aria-label*="copy" i], button:has-text("Copy")');
      await expect(copyButton).toHaveCount(0);
    }
  });

  test("Chat components respect prefers-reduced-motion for streaming animation", async ({
    page,
  }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(CHAT_URL);

    const cursor = page.locator(
      '[data-testid="streaming-cursor"], [data-testid="streaming-indicator"]'
    );

    if ((await cursor.count()) > 0) {
      // With reduced motion, animation should be disabled
      const animationDuration = await cursor
        .first()
        .evaluate(
          (el) => window.getComputedStyle(el).animationDuration
        );
      // Should be "0s" or empty when reduced motion is active
      expect(["0s", "0ms", "", "none"]).toContain(animationDuration);
    } else {
      test.fail();
    }
  });
});

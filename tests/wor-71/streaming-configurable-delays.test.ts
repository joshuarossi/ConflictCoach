/**
 * WOR-71 — AC: Stub simulates streaming with configurable delays
 *
 * The mock streaming path in convex/lib/streaming.ts currently uses a
 * hardcoded 20ms per-word delay. This AC requires that delays be
 * configurable so E2E tests can control timing (fast for CI, slower for
 * visual debugging).
 *
 * These tests import a MockStreamConfig type and a configureMockDelay
 * function that do not exist yet — the imports will fail, which is the
 * correct red state.
 */
import { describe, test, expect } from "vitest";

// These named exports do not exist yet — import failure = correct red state.
import {
  configureMockDelay,
  getMockDelayConfig,
  type MockStreamConfig,
} from "../../convex/lib/streaming";

describe("Stub simulates streaming with configurable delays", () => {
  test("configureMockDelay is exported as a function", () => {
    expect(typeof configureMockDelay).toBe("function");
  });

  test("getMockDelayConfig is exported as a function", () => {
    expect(typeof getMockDelayConfig).toBe("function");
  });

  test("default delay config has reasonable values", () => {
    const config: MockStreamConfig = getMockDelayConfig();
    expect(config).toHaveProperty("delayPerTokenMs");
    expect(typeof config.delayPerTokenMs).toBe("number");
    expect(config.delayPerTokenMs).toBeGreaterThanOrEqual(0);
  });

  test("configureMockDelay sets a custom per-token delay", () => {
    configureMockDelay({ delayPerTokenMs: 100 });
    const config = getMockDelayConfig();
    expect(config.delayPerTokenMs).toBe(100);
  });

  test("configureMockDelay accepts zero delay for fast CI runs", () => {
    configureMockDelay({ delayPerTokenMs: 0 });
    const config = getMockDelayConfig();
    expect(config.delayPerTokenMs).toBe(0);
  });

  test("configureMockDelay supports a batchIntervalMs option", () => {
    configureMockDelay({ delayPerTokenMs: 10, batchIntervalMs: 25 });
    const config = getMockDelayConfig();
    expect(config.batchIntervalMs).toBe(25);
  });
});

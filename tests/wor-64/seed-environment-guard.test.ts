/**
 * WOR-64 AC6: Guarded — only runs if NODE_ENV=development or CLAUDE_MOCK=true
 *
 * The seed action must throw an error when executed outside a development
 * environment and succeed when the environment guard is satisfied.
 */
import { describe, test, expect, afterEach, vi } from "vitest";
import {
  createMockActionContext,
  callHandler,
  importSeedModule,
  getSeedHandler,
} from "./helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("AC6: Environment guard", () => {
  test("throws when NODE_ENV is production and CLAUDE_MOCK is unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLAUDE_MOCK", "");

    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx } = createMockActionContext();

    await expect(callHandler(handler, ctx)).rejects.toThrow();
  });

  test("throws when NODE_ENV is undefined and CLAUDE_MOCK is unset", async () => {
    vi.stubEnv("NODE_ENV", "");
    vi.stubEnv("CLAUDE_MOCK", "");

    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx } = createMockActionContext();

    await expect(callHandler(handler, ctx)).rejects.toThrow();
  });

  test("succeeds when NODE_ENV is development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx } = createMockActionContext();

    await expect(
      callHandler(handler, ctx),
    ).resolves.not.toThrow();
  });

  test("succeeds when CLAUDE_MOCK is true (regardless of NODE_ENV)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CLAUDE_MOCK", "true");

    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx } = createMockActionContext();

    await expect(
      callHandler(handler, ctx),
    ).resolves.not.toThrow();
  });
});

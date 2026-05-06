/**
 * WOR-48: Coach facilitator AI — Opening message tests
 *
 * AC 6: Coach opening message is generated when case enters JOINT_ACTIVE
 *        (grounded in case's main topic)
 *
 * The implementation module does not exist yet. A vitest alias resolves the
 * import to a stub that returns undefined, causing tests to fail at the
 * assertion level (red state). When the real implementation is created,
 * remove the alias in vitest.config.ts and the stub file.
 */
import { describe, test, expect } from "vitest";

import { buildOpeningMessagePrompt } from "../../convex/jointChat";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CASE_MAIN_TOPIC =
  "Disagreement over project deadlines and workload distribution";
const CASE_CATEGORY = "workplace";

// ---------------------------------------------------------------------------
// AC 6: Opening message generated on JOINT_ACTIVE
// ---------------------------------------------------------------------------
describe("AC 6: Coach opening message on JOINT_ACTIVE", () => {
  test("buildOpeningMessagePrompt is exported and callable", () => {
    // Red-state: stub returns undefined; real implementation should export this function
    expect(buildOpeningMessagePrompt).toBeDefined();
    expect(typeof buildOpeningMessagePrompt).toBe("function");
  });

  test("opening message prompt is grounded in the case's mainTopic", () => {
    const prompt = buildOpeningMessagePrompt({
      mainTopic: CASE_MAIN_TOPIC,
      category: CASE_CATEGORY,
    });

    // Red-state: stub returns undefined; real implementation returns a string
    expect(prompt).toBeDefined();
    expect(typeof prompt).toBe("string");
    expect(prompt as string).toContain(CASE_MAIN_TOPIC);
  });

  test("opening message prompt includes the case category", () => {
    const prompt = buildOpeningMessagePrompt({
      mainTopic: CASE_MAIN_TOPIC,
      category: CASE_CATEGORY,
    });

    expect(prompt).toBeDefined();
    expect(typeof prompt).toBe("string");
    expect(prompt as string).toContain(CASE_CATEGORY);
  });

  test("opening message prompt welcomes both parties", () => {
    const prompt = buildOpeningMessagePrompt({
      mainTopic: CASE_MAIN_TOPIC,
      category: CASE_CATEGORY,
    });

    expect(prompt).toBeDefined();
    expect(typeof prompt).toBe("string");

    const lowerPrompt = (prompt as string).toLowerCase();
    expect(
      lowerPrompt.includes("welcome") ||
        lowerPrompt.includes("both") ||
        lowerPrompt.includes("parties") ||
        lowerPrompt.includes("together"),
    ).toBe(true);
  });
});

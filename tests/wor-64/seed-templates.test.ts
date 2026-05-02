/**
 * WOR-64 AC3 + AC4: Creates 3 default templates with initial versions
 *
 * AC3: Creates 3 default templates: workplace, family, personal —
 *      each with a minimal globalGuidance text.
 * AC4: Each template has an initial templateVersion published (v1).
 */
import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  createMockActionContext,
  callHandler,
  importSeedModule,
  getSeedHandler,
  type MockTemplate,
  type MockTemplateVersion,
} from "./helpers";

const EXPECTED_CATEGORIES = ["family", "personal", "workplace"] as const;

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
});

describe("AC3: Creates 3 default templates (workplace, family, personal)", () => {
  test("creates exactly 3 templates", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const templates = getTable<MockTemplate>("templates");
    expect(templates).toHaveLength(3);
  });

  test("templates cover all three required categories", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const templates = getTable<MockTemplate>("templates");
    const categories = templates.map((t) => t.category).sort();

    expect(categories).toEqual([...EXPECTED_CATEGORIES]);
  });

  test("each template has a currentVersionId pointing to its version", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const templates = getTable<MockTemplate>("templates");

    for (const template of templates) {
      expect(template.currentVersionId).toBeDefined();
      expect(typeof template.currentVersionId).toBe("string");
      expect(template.currentVersionId!.length).toBeGreaterThan(0);
    }
  });

  test("each template has a createdByUserId referencing the admin", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const templates = getTable<MockTemplate>("templates");

    for (const template of templates) {
      expect(template.createdByUserId).toBeDefined();
      expect(typeof template.createdByUserId).toBe("string");
    }
  });
});

describe("AC4: Each template has an initial templateVersion (v1)", () => {
  test("creates exactly 3 template versions (one per template)", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const versions = getTable<MockTemplateVersion>("templateVersions");
    expect(versions).toHaveLength(3);
  });

  test("each version has version number 1", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const versions = getTable<MockTemplateVersion>("templateVersions");

    for (const version of versions) {
      expect(version.version).toBe(1);
    }
  });

  test("each version has non-empty globalGuidance text", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const versions = getTable<MockTemplateVersion>("templateVersions");

    for (const version of versions) {
      expect(version.globalGuidance).toBeDefined();
      expect(typeof version.globalGuidance).toBe("string");
      expect(version.globalGuidance.length).toBeGreaterThan(0);
    }
  });

  test("each template's currentVersionId matches its version row", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const templates = getTable<MockTemplate>("templates");
    const versions = getTable<MockTemplateVersion>("templateVersions");

    for (const template of templates) {
      const matchingVersion = versions.find(
        (v) => v._id === template.currentVersionId,
      );
      expect(matchingVersion).toBeDefined();
      expect(matchingVersion!.templateId).toBe(template._id);
    }
  });

  test("each version has a publishedAt timestamp", async () => {
    const seedModule = await importSeedModule();
    const handler = getSeedHandler(seedModule);
    const { ctx, getTable } = createMockActionContext();

    await callHandler(handler, ctx);

    const versions = getTable<MockTemplateVersion>("templateVersions");

    for (const version of versions) {
      expect(typeof version.publishedAt).toBe("number");
      expect(version.publishedAt).toBeGreaterThan(0);
    }
  });
});

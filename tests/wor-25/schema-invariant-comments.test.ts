import { describe, test, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const SCHEMA_PATH = path.resolve(__dirname, "../../convex/schema.ts");

let schemaSource: string;

beforeAll(() => {
  schemaSource = readFileSync(SCHEMA_PATH, "utf-8");
});

describe("AC5: Key invariants are documented as comments: templateVersionId immutability, privateMessages isolation, schemaVersion presence", () => {
  test("contains a comment documenting templateVersionId immutability", () => {
    // The comment should mention that templateVersionId is set at creation
    // and never updated (pinned / immutable for the life of the case)
    const hasImmutabilityComment =
      /\/\/.*templateVersionId.*(?:immut|never\s+(?:change|update)|pinned|set\s+at\s+creation)/i.test(
        schemaSource
      ) ||
      /\/\*[\s\S]*?templateVersionId[\s\S]*?(?:immut|never\s+(?:change|update)|pinned|set\s+at\s+creation)[\s\S]*?\*\//i.test(
        schemaSource
      );
    expect(hasImmutabilityComment).toBe(true);
  });

  test("contains a comment documenting privateMessages isolation", () => {
    // The comment should mention that privateMessages are isolated per-party
    // or that the by_case index is server-side only / never exposed to clients
    const hasIsolationComment =
      /\/\/.*privateMessages?.*(?:isolat|per.party|only.*user|never\s+exposed)/i.test(
        schemaSource
      ) ||
      /\/\/.*(?:isolat|per.party|only.*user|never\s+exposed).*privateMessages?/i.test(
        schemaSource
      ) ||
      /\/\*[\s\S]*?privateMessages?[\s\S]*?(?:isolat|per.party|never\s+exposed)[\s\S]*?\*\//i.test(
        schemaSource
      );
    expect(hasIsolationComment).toBe(true);
  });

  test("contains a comment documenting schemaVersion presence", () => {
    // The comment should mention that schemaVersion is present for
    // forward migration support or is always 1
    const hasSchemaVersionComment =
      /\/\/.*schemaVersion.*(?:migrat|forward|always|version)/i.test(
        schemaSource
      ) ||
      /\/\*[\s\S]*?schemaVersion[\s\S]*?(?:migrat|forward|always|version)[\s\S]*?\*\//i.test(
        schemaSource
      );
    expect(hasSchemaVersionComment).toBe(true);
  });
});

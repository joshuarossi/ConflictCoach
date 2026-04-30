import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const AUTH_CONFIG_PATH = path.resolve(
  __dirname,
  "../../convex/auth.config.ts",
);

describe("AC: Auth config references correct env vars (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, MAGIC_LINK_EMAIL_FROM)", () => {
  test("auth config references GOOGLE_OAUTH_CLIENT_ID", () => {
    const source = readFileSync(AUTH_CONFIG_PATH, "utf-8");
    expect(source).toContain("GOOGLE_OAUTH_CLIENT_ID");
  });

  test("auth config references GOOGLE_OAUTH_CLIENT_SECRET", () => {
    const source = readFileSync(AUTH_CONFIG_PATH, "utf-8");
    expect(source).toContain("GOOGLE_OAUTH_CLIENT_SECRET");
  });

  test("auth config references MAGIC_LINK_EMAIL_FROM", () => {
    const source = readFileSync(AUTH_CONFIG_PATH, "utf-8");
    expect(source).toContain("MAGIC_LINK_EMAIL_FROM");
  });
});

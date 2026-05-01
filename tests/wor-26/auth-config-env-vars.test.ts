import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const AUTH_PATH = path.resolve(__dirname, "../../convex/auth.ts");

describe("AC: Auth config references correct env vars (AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, MAGIC_LINK_EMAIL_FROM, RESEND_API_KEY)", () => {
  test("auth config references AUTH_GOOGLE_ID", () => {
    const source = readFileSync(AUTH_PATH, "utf-8");
    expect(source).toContain("AUTH_GOOGLE_ID");
  });

  test("auth config references AUTH_GOOGLE_SECRET", () => {
    const source = readFileSync(AUTH_PATH, "utf-8");
    expect(source).toContain("AUTH_GOOGLE_SECRET");
  });

  test("auth config references MAGIC_LINK_EMAIL_FROM", () => {
    const source = readFileSync(AUTH_PATH, "utf-8");
    expect(source).toContain("MAGIC_LINK_EMAIL_FROM");
  });

  test("auth config references RESEND_API_KEY", () => {
    const source = readFileSync(AUTH_PATH, "utf-8");
    expect(source).toContain("RESEND_API_KEY");
  });
});

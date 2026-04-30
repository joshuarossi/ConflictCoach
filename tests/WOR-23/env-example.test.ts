import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../..");

describe(".env.example documents all required env vars", () => {
  const requiredVars = [
    "VITE_CONVEX_URL",
    "CONVEX_DEPLOYMENT",
    "ANTHROPIC_API_KEY",
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "MAGIC_LINK_EMAIL_FROM",
    "SITE_URL",
  ];

  test(".env.example file exists and is readable", () => {
    expect(() => {
      readFileSync(resolve(root, ".env.example"), "utf-8");
    }).not.toThrow();
  });

  test.each(requiredVars)(
    ".env.example contains %s",
    (varName) => {
      const content = readFileSync(resolve(root, ".env.example"), "utf-8");
      expect(content).toContain(varName);
    },
  );
});

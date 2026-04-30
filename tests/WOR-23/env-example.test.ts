import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("AC: .env.example documents all required env vars", () => {
  const REQUIRED_VARS = [
    "VITE_CONVEX_URL",
    "CONVEX_DEPLOYMENT",
    "ANTHROPIC_API_KEY",
    "GOOGLE_OAUTH_CLIENT_ID",
    "GOOGLE_OAUTH_CLIENT_SECRET",
    "MAGIC_LINK_EMAIL_FROM",
    "SITE_URL",
  ];

  test(".env.example exists and contains all required environment variables", () => {
    const envPath = resolve(__dirname, "../../.env.example");
    const content = readFileSync(envPath, "utf-8");

    for (const varName of REQUIRED_VARS) {
      expect(content, `Missing env var: ${varName}`).toContain(varName);
    }
  });
});

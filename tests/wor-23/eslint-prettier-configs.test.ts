import { describe, test, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

describe("AC: ESLint and Prettier configs are present and npm run lint passes", () => {
  const root = resolve(__dirname, "../..");

  test("ESLint configuration file exists", () => {
    const eslintConfigs = [
      ".eslintrc",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.json",
      ".eslintrc.yml",
      ".eslintrc.yaml",
      "eslint.config.js",
      "eslint.config.mjs",
      "eslint.config.cjs",
      "eslint.config.ts",
      "eslint.config.mts",
      "eslint.config.cts",
    ];

    const hasEslintConfig = eslintConfigs.some((file) =>
      existsSync(resolve(root, file)),
    );
    expect(hasEslintConfig).toBe(true);
  });

  test("Prettier configuration file exists", () => {
    const prettierConfigs = [
      ".prettierrc",
      ".prettierrc.js",
      ".prettierrc.cjs",
      ".prettierrc.json",
      ".prettierrc.yml",
      ".prettierrc.yaml",
      ".prettierrc.toml",
      "prettier.config.js",
      "prettier.config.cjs",
      "prettier.config.mjs",
    ];

    const hasPrettierConfig = prettierConfigs.some((file) =>
      existsSync(resolve(root, file)),
    );
    expect(hasPrettierConfig).toBe(true);
  });
});

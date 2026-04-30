import { describe, test, expect } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "../..");

describe("ESLint and Prettier configs are present and npm run lint passes", () => {
  test("ESLint config file exists", () => {
    // ESLint config can be in various forms
    const possibleConfigs = [
      "eslint.config.js",
      "eslint.config.mjs",
      "eslint.config.cjs",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.json",
      ".eslintrc.yml",
      ".eslintrc.yaml",
      ".eslintrc",
    ];
    const hasEslintConfig = possibleConfigs.some((f) =>
      existsSync(resolve(root, f)),
    );
    expect(hasEslintConfig).toBe(true);
  });

  test("Prettier config file exists", () => {
    const possibleConfigs = [
      ".prettierrc",
      ".prettierrc.js",
      ".prettierrc.cjs",
      ".prettierrc.mjs",
      ".prettierrc.json",
      ".prettierrc.yml",
      ".prettierrc.yaml",
      ".prettierrc.toml",
      "prettier.config.js",
      "prettier.config.cjs",
      "prettier.config.mjs",
    ];
    const hasPrettierConfig = possibleConfigs.some((f) =>
      existsSync(resolve(root, f)),
    );
    expect(hasPrettierConfig).toBe(true);
  });

  test("npm run lint exits with code 0", () => {
    expect(() => {
      execSync("npm run lint", { cwd: root, stdio: "pipe" });
    }).not.toThrow();
  });
});

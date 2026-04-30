import { describe, test, expect } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

describe("AC: ESLint and Prettier configs are present and npm run lint passes", () => {
  const rootDir = resolve(__dirname, "../..");

  test("ESLint configuration file exists", () => {
    const possibleConfigs = [
      "eslint.config.js",
      "eslint.config.mjs",
      "eslint.config.cjs",
      ".eslintrc.js",
      ".eslintrc.cjs",
      ".eslintrc.json",
      ".eslintrc.yml",
      ".eslintrc.yaml",
    ];

    const hasEslintConfig = possibleConfigs.some((config) =>
      existsSync(resolve(rootDir, config))
    );

    expect(hasEslintConfig).toBe(true);
  });

  test("Prettier configuration file exists", () => {
    const possibleConfigs = [
      ".prettierrc",
      ".prettierrc.js",
      ".prettierrc.cjs",
      ".prettierrc.json",
      ".prettierrc.yml",
      ".prettierrc.yaml",
      "prettier.config.js",
      "prettier.config.cjs",
      "prettier.config.mjs",
    ];

    // Prettier config can also be in package.json
    const hasConfig = possibleConfigs.some((config) =>
      existsSync(resolve(rootDir, config))
    );

    // If no standalone config, check package.json for "prettier" key
    if (!hasConfig) {
      const pkg = JSON.parse(
        require("fs").readFileSync(resolve(rootDir, "package.json"), "utf-8")
      );
      expect(pkg.prettier).toBeDefined();
    } else {
      expect(hasConfig).toBe(true);
    }
  });

  test("npm run lint exits with code 0", () => {
    expect(() => {
      execSync("npm run lint", {
        cwd: rootDir,
        stdio: "pipe",
        timeout: 30000,
      });
    }).not.toThrow();
  });
});

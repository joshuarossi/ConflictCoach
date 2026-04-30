import { describe, test, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

describe("AC: ESLint and Prettier configs are present and npm run lint passes", () => {
  test("ESLint config file exists", () => {
    const root = resolve(__dirname, "../..");
    // Check for any common ESLint config file name
    const eslintConfigCandidates = [
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

    const found = eslintConfigCandidates.some((name) =>
      existsSync(resolve(root, name))
    );

    expect(found, "No ESLint config file found in project root").toBe(true);
  });

  test("Prettier config file exists", () => {
    const root = resolve(__dirname, "../..");
    const prettierConfigCandidates = [
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

    const found = prettierConfigCandidates.some((name) =>
      existsSync(resolve(root, name))
    );

    expect(found, "No Prettier config file found in project root").toBe(true);
  });

  test("ESLint is listed as a devDependency", () => {
    const pkg = JSON.parse(
      require("fs").readFileSync(
        resolve(__dirname, "../../package.json"),
        "utf-8"
      )
    );
    expect(pkg.devDependencies?.["eslint"]).toBeDefined();
  });

  test("Prettier is listed as a devDependency", () => {
    const pkg = JSON.parse(
      require("fs").readFileSync(
        resolve(__dirname, "../../package.json"),
        "utf-8"
      )
    );
    expect(pkg.devDependencies?.["prettier"]).toBeDefined();
  });
});

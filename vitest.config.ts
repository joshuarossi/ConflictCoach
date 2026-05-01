import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // WOR-48: stub for not-yet-implemented module. Remove when real file exists.
      "../../convex/jointChat/generateCoachResponse": path.resolve(
        __dirname,
        "./tests/wor-48/__stubs__/generateCoachResponse.ts",
      ),
    },
  },
});

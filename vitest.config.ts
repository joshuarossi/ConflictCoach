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
      // WOR-49: Stub alias — remove once src/components/JointChatView.tsx exists.
      "@/components/JointChatView": path.resolve(
        __dirname,
        "./tests/wor-49/_stub-joint-chat-view.tsx",
      ),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

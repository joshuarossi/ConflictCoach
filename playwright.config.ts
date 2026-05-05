import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.E2E_BASE_URL;
const baseURL = externalBaseURL ?? "http://localhost:5174";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(externalBaseURL
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://localhost:5174",
          reuseExistingServer: !process.env.CI,
          timeout: 15000,
          // E2E sign-in goes through window.__TEST_SIGN_IN__, mounted only
          // when Vite sees VITE_E2E_TEST_MODE=true at startup. Pass both flags
          // explicitly so the spawned dev server has the test-mode shim.
          env: {
            VITE_E2E_TEST_MODE: "true",
            CLAUDE_MOCK: "true",
          },
        },
      }),
});

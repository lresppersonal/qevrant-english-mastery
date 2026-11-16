import { defineConfig, devices } from "@playwright/test";

const chrome = process.env.PW_CHROME_PATH; // e.g. /usr/bin/google-chrome when Playwright browsers aren't installed

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    launchOptions: chrome ? { executablePath: chrome } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    { command: "node e2e/mock-anthropic.mjs", port: 4010, reuseExistingServer: true },
    {
      command: "npx next start -p 3100",
      port: 3100,
      reuseExistingServer: true,
      env: { ANTHROPIC_API_KEY: "test-key", ANTHROPIC_BASE_URL: "http://localhost:4010", AI_DEMO_ALLOW: "true", NEXT_TELEMETRY_DISABLED: "1" },
    },
  ],
});

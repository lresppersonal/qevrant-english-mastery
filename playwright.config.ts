import { defineConfig, devices } from "@playwright/test";

const chrome = process.env.PW_CHROME_PATH; // e.g. /usr/bin/google-chrome when Playwright browsers aren't installed

export default defineConfig({
  testDir: "e2e",
  testIgnore: /accounts\.spec\.ts/, // runs against a real Supabase: playwright.supabase.config.ts
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
    // Fake microphone so the speaking studio can be tested headlessly.
    launchOptions: { ...(chrome ? { executablePath: chrome } : {}), args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] },
    permissions: ["microphone"],
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    { command: "node e2e/mock-anthropic.mjs", port: 4010, reuseExistingServer: true },
    { command: "node e2e/mock-dictionary.mjs", port: 4011, reuseExistingServer: true },
    {
      command: "npx next start -p 3100",
      port: 3100,
      reuseExistingServer: true,
      env: { ANTHROPIC_API_KEY: "test-key", ANTHROPIC_BASE_URL: "http://localhost:4010", AI_DEMO_ALLOW: "true", AI_MAX_RETRIES: "0", DICTIONARY_API_BASE: "http://localhost:4011/api/v2/entries/en", NEXT_TELEMETRY_DISABLED: "1" },
    },
  ],
});
